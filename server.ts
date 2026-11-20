import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import Stripe from 'stripe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

type GeminiHealthStatus = 'ready' | 'unconfigured' | 'invalid_key';
let geminiKeyStatus: GeminiHealthStatus = 'unconfigured';

function normalizeGeminiApiKey(raw: string | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  if (/^[A-Z0-9_]+=/i.test(value)) {
    value = value.slice(value.indexOf('=') + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1).trim();
    }
  }

  if (
    !value ||
    value === 'MY_GEMINI_API_KEY' ||
    value.startsWith('YOUR_') ||
    value.length < 10
  ) {
    return null;
  }

  return value;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = normalizeGeminiApiKey(
    process.env.GEMINI_API_KEY ?? process.env.API_KEY
  );
  if (!apiKey) {
    geminiKeyStatus = 'unconfigured';
    return null;
  }
  if (geminiKeyStatus === 'unconfigured') {
    geminiKeyStatus = 'ready';
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function classifyGeminiError(error: unknown): {
  code: string;
  retryable: boolean;
} {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
    return { code: 'API_KEY_INVALID', retryable: false };
  }
  if (msg.includes('PERMISSION_DENIED') || msg.includes('"code":403')) {
    return { code: 'PERMISSION_DENIED', retryable: false };
  }
  if (msg.includes('NOT_FOUND') || msg.includes('"code":404')) {
    return { code: 'MODEL_NOT_FOUND', retryable: false };
  }
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('"code":429')) {
    return { code: 'RESOURCE_EXHAUSTED', retryable: true };
  }
  if (msg.includes('"code":400') || msg.includes('INVALID_ARGUMENT')) {
    return { code: 'INVALID_ARGUMENT', retryable: false };
  }
  return { code: 'TRANSIENT_OR_NETWORK', retryable: true };
}

async function withGeminiRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      const result = await operation();
      geminiKeyStatus = 'ready';
      return result;
    } catch (error) {
      const { code, retryable } = classifyGeminiError(error);
      if (code === 'API_KEY_INVALID' || code === 'PERMISSION_DENIED') {
        geminiKeyStatus = 'invalid_key';
      }
      if (!retryable || attempt >= maxRetries) {
        throw Object.assign(new Error(code), { geminiCode: code });
      }
      attempt += 1;
      const delayMs = 300 * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

const LAUNCH_CATEGORIES = [
  'Windows lento o bajo rendimiento',
  'Aplicaciones que no arrancan',
  'Pantallazos azules (BSOD)',
  'Problemas de Wi-Fi o red',
  'Errores de Microsoft 365 y Outlook',
  'Configuración de impresoras',
  'Eliminación de malware y virus',
  'Recuperación de archivos',
  'Actualizaciones de Windows',
  'VPN y acceso remoto',
] as const;

type ServiceTierValue = 'Express $15' | 'Optimización $29' | 'Avanzado $39';

function classifyLaunchScenario(
  category: string,
  description: string
): { suggestedCategory: string; suggestedTier: ServiceTierValue } {
  const lower = description.toLowerCase();

  if (/pantalla azul|bsod|volcado|minidump|stop code|kernel panic|reinicio inesperado/i.test(lower)) {
    return { suggestedCategory: 'Pantallazos azules (BSOD)', suggestedTier: 'Avanzado $39' };
  }
  if (/vpn|wireguard|fortinet|openvpn|cisco|rdp|escritorio remoto|acceso remoto|teletrabajo/i.test(lower)) {
    return { suggestedCategory: 'VPN y acceso remoto', suggestedTier: 'Avanzado $39' };
  }
  if (/recupera|archivo.*borr|borrad|eliminad|papelera|partici[oó]n|usb da[nñ]|disco.*no reconoce|rescate de datos/i.test(lower)) {
    return { suggestedCategory: 'Recuperación de archivos', suggestedTier: 'Avanzado $39' };
  }
  if (/virus|malware|adware|troyano|secuestr|ransom|pop-?ups?|publicidad invasiva|extensi[oó]n maliciosa/i.test(lower)) {
    return { suggestedCategory: 'Eliminación de malware y virus', suggestedTier: 'Optimización $29' };
  }
  if (/windows update|actualizaci[oó]n.*windows|parche|kb\d+|error 0x800/i.test(lower)) {
    return { suggestedCategory: 'Actualizaciones de Windows', suggestedTier: 'Optimización $29' };
  }
  if (/lento|lentitud|rendimiento|cpu.*100|disco.*100|arranque|demora en encender/i.test(lower)) {
    return { suggestedCategory: 'Windows lento o bajo rendimiento', suggestedTier: 'Optimización $29' };
  }
  if (/outlook|microsoft 365|office|pst|ost|mfa|correo|exchange|teams/i.test(lower)) {
    return { suggestedCategory: 'Errores de Microsoft 365 y Outlook', suggestedTier: 'Express $15' };
  }
  if (/impresora|spooler|esc[aá]ner|cola de impresi|driver.*(hp|epson|canon|brother)/i.test(lower)) {
    return { suggestedCategory: 'Configuración de impresoras', suggestedTier: 'Express $15' };
  }
  if (/no abre|no arranca|se cierra|crash|dll|runtime|error al iniciar/i.test(lower)) {
    return { suggestedCategory: 'Aplicaciones que no arrancan', suggestedTier: 'Express $15' };
  }
  if (/wi-?fi|red\b|dns|dhcp|internet|sin conexi[oó]n|ethernet|servidor|dominio|respaldo|migra/i.test(lower)) {
    if (/servidor|dominio|respaldo|migra/i.test(lower)) {
      return {
        suggestedCategory: category === 'Otro' ? 'VPN y acceso remoto' : category,
        suggestedTier: 'Avanzado $39',
      };
    }
    return { suggestedCategory: 'Problemas de Wi-Fi o red', suggestedTier: 'Express $15' };
  }

  const categoryTierMap: Record<string, { cat: string; tier: ServiceTierValue }> = {
    'Windows lento o bajo rendimiento': { cat: 'Windows lento o bajo rendimiento', tier: 'Optimización $29' },
    'Aplicaciones que no arrancan': { cat: 'Aplicaciones que no arrancan', tier: 'Express $15' },
    'Pantallazos azules (BSOD)': { cat: 'Pantallazos azules (BSOD)', tier: 'Avanzado $39' },
    'Problemas de Wi-Fi o red': { cat: 'Problemas de Wi-Fi o red', tier: 'Express $15' },
    'Errores de Microsoft 365 y Outlook': { cat: 'Errores de Microsoft 365 y Outlook', tier: 'Express $15' },
    'Configuración de impresoras': { cat: 'Configuración de impresoras', tier: 'Express $15' },
    'Eliminación de malware y virus': { cat: 'Eliminación de malware y virus', tier: 'Optimización $29' },
    'Recuperación de archivos': { cat: 'Recuperación de archivos', tier: 'Avanzado $39' },
    'Actualizaciones de Windows': { cat: 'Actualizaciones de Windows', tier: 'Optimización $29' },
    'VPN y acceso remoto': { cat: 'VPN y acceso remoto', tier: 'Avanzado $39' },
    Impresoras: { cat: 'Configuración de impresoras', tier: 'Express $15' },
    'Correo/Office': { cat: 'Errores de Microsoft 365 y Outlook', tier: 'Express $15' },
    'Sistema Operativo/Lentitud': { cat: 'Windows lento o bajo rendimiento', tier: 'Optimización $29' },
    'Redes/Wi-Fi': { cat: 'Problemas de Wi-Fi o red', tier: 'Express $15' },
  };

  const matched = categoryTierMap[category];
  if (matched) {
    return { suggestedCategory: matched.cat, suggestedTier: matched.tier };
  }
  return { suggestedCategory: 'Windows lento o bajo rendimiento', suggestedTier: 'Express $15' };
}

function buildFallbackReceptionist(input: {
  category: string;
  osType: string;
  description: string;
}) {
  const { category, osType, description } = input;
  const { suggestedCategory, suggestedTier } = classifyLaunchScenario(category, description);

  const questionsByCategory: Record<string, string[]> = {
    'Windows lento o bajo rendimiento': [
      '¿La lentitud ocurre desde el encendido del equipo o al abrir varias aplicaciones?',
      '¿Has notado el disco o CPU al 100% en el Administrador de Tareas o ventilador alto?',
      '¿Cuánto espacio libre queda aproximadamente en tu disco principal?',
    ],
    'Aplicaciones que no arrancan': [
      '¿Qué aplicación exacta falla y qué código o mensaje de error aparece al abrirla?',
      '¿El programa dejó de funcionar después de una actualización o instalación reciente?',
      '¿Ocurre en tu usuario actual o también al ejecutar como administrador?',
    ],
    'Pantallazos azules (BSOD)': [
      '¿Qué código de detención muestra la pantalla azul (ej. CRITICAL_PROCESS_DIED, DRIVER_IRQL)?',
      '¿El pantallazo ocurre al conectar un dispositivo USB, abrir un programa o de forma aleatoria?',
      '¿El equipo logra iniciar normalmente en Windows o entra en bucle de recuperación?',
    ],
    'Problemas de Wi-Fi o red': [
      '¿La desconexión afecta únicamente a este equipo o a otros teléfonos/PCs en la misma red?',
      '¿Aparece el icono de Wi-Fi como "Sin acceso a Internet" o no detecta ninguna red?',
      '¿Ocurre por Wi-Fi o también conectando un cable de red Ethernet directo al router?',
    ],
    'Errores de Microsoft 365 y Outlook': [
      '¿El problema ocurre en Outlook de escritorio o también al ingresar por navegador (webmail)?',
      '¿Solicita contraseña en bucle, falla la verificación MFA o muestra error de archivo PST/OST?',
      '¿La cuenta pertenece a Microsoft 365 empresarial/educativo o es cuenta personal?',
    ],
    'Configuración de impresoras': [
      '¿La impresora está conectada por cable USB directo o mediante Wi-Fi/red compartida?',
      '¿Los trabajos quedan atascados en la cola de impresión o aparece como "Sin conexión"?',
      '¿Se cambió recientemente el router, la clave Wi-Fi o se actualizó el sistema operativo?',
    ],
    'Eliminación de malware y virus': [
      '¿Ves ventanas emergentes (pop-ups), redirecciones en el navegador o consumo extraño de recursos?',
      '¿Instalaste recientemente algún programa gratuito, extensión de navegador o archivo adjunto?',
      '¿Necesitas conservar tus navegadores con marcadores y contraseñas guardadas tras la limpieza?',
    ],
    'Recuperación de archivos': [
      '¿Los archivos estaban en el disco interno del equipo, memoria USB o disco externo?',
      '¿Se eliminaron de la Papelera o la partición/unidad comenzó a pedir formato o mostrar formato RAW?',
      '¿Has seguido guardando archivos nuevos en esa misma unidad después de notar la pérdida?',
    ],
    'Actualizaciones de Windows': [
      '¿La actualización queda congelada en un porcentaje o revierte los cambios al reiniciar?',
      '¿Qué código de error muestra Windows Update (ej. 0x80070002, 0x800f0922)?',
      '¿El equipo presenta fallas desde la instalación de un parche reciente que requiera desinstalarse?',
    ],
    'VPN y acceso remoto': [
      '¿Qué cliente VPN o protocolo utilizas (WireGuard, Fortinet, OpenVPN, Cisco, VPN Windows)?',
      '¿El túnel logra autenticar pero no abre recursos internos, o falla antes de conectar?',
      '¿Utilizas Escritorio Remoto (RDP) hacia un equipo de oficina o servidor interno?',
    ],
    Otro: [
      '¿El incidente bloquea por completo tu trabajo actual o es intermitente?',
      '¿Necesitas respaldo previo de archivos antes de aplicar cambios en el sistema?',
      '¿Tienes permisos de administrador local en el equipo?',
    ],
  };

  const preDiagnosisMap: Record<string, string> = {
    'Windows lento o bajo rendimiento': `Pre-diagnóstico AI Receptionist (${osType}): Saturación de procesos en segundo plano, aplicaciones de inicio o almacenamiento que requieren optimización controlada.`,
    'Aplicaciones que no arrancan': `Pre-diagnóstico AI Receptionist (${osType}): Probable conflicto de librerías runtime/DLL, corrupción de caché de usuario o permisos locales.`,
    'Pantallazos azules (BSOD)': `Pre-diagnóstico AI Receptionist (${osType}): Posible fallo de controlador de kernel, corrupción de archivos críticos del sistema o conflicto tras parche reciente.`,
    'Problemas de Wi-Fi o red': `Pre-diagnóstico AI Receptionist (${osType}): Inestabilidad en adaptador inalámbrico, pila Winsock/TCP-IP o resolución DNS incorrecta.`,
    'Errores de Microsoft 365 y Outlook': `Pre-diagnóstico AI Receptionist (${osType}): Probable caché corrupta de Modern Auth (WAM), perfil PST/OST dañado o conflicto de licenciamiento.`,
    'Configuración de impresoras': `Pre-diagnóstico AI Receptionist (${osType}): Posible bloqueo en cola de impresión (spooler), desajuste de puerto IPP/TCP o controlador incompatible.`,
    'Eliminación de malware y virus': `Pre-diagnóstico AI Receptionist (${osType}): Posible presencia de adware, tareas programadas persistentes o secuestro de configuración de navegadores.`,
    'Recuperación de archivos': `Pre-diagnóstico AI Receptionist (${osType}): Pérdida lógica de archivos o tabla de particiones; se priorizará escaneo de solo lectura para evitar sobrescritura.`,
    'Actualizaciones de Windows': `Pre-diagnóstico AI Receptionist (${osType}): Corrupción en caché SoftwareDistribution / WinSxS o conflicto de driver durante actualización acumulativa.`,
    'VPN y acceso remoto': `Pre-diagnóstico AI Receptionist (${osType}): Desajuste en adaptador virtual TAP/WireGuard, rutas divididas, MTU o bloqueo de puertos RDP/VPN.`,
    Otro: `Pre-diagnóstico AI Receptionist (${osType}): Incidencia de software o configuración apta para resolución remota supervisada.`,
  };

  const selfServiceByCategory: Record<string, string[]> = {
    'Windows lento o bajo rendimiento': [
      'Abre el Administrador de Tareas (Ctrl + Shift + Esc) y verifica qué proceso consume más disco o CPU.',
      'Desactiva aplicaciones innecesarias en la pestaña "Aplicaciones de arranque" y reinicia el equipo.',
    ],
    'Aplicaciones que no arrancan': [
      'Reinicia el equipo e intenta abrir la aplicación haciendo clic derecho → "Ejecutar como administrador".',
      'Verifica si la aplicación tiene actualizaciones pendientes o si el antivirus la bloqueó en cuarentena.',
    ],
    'Pantallazos azules (BSOD)': [
      'Desconecta periféricos USB no esenciales (discos externos, hubs o adaptadores) y reinicia para probar estabilidad.',
      'Anota el código de detención (ej. DRIVER_IRQL) para que el especialista analice el volcado Minidump.',
    ],
    'Problemas de Wi-Fi o red': [
      'Activa y desactiva el Modo Avión durante 10 segundos o reinicia tu router durante 30 segundos.',
      'Comprueba si otros dispositivos en la misma red sí tienen internet para descartar fallo del proveedor.',
    ],
    'Errores de Microsoft 365 y Outlook': [
      'Verifica si puedes abrir tu correo desde el navegador web (outlook.office.com) para confirmar que la cuenta está activa.',
      'Cierra completamente Outlook desde la bandeja del sistema y ábrelo en Modo Seguro (Win + R → outlook.exe /safe).',
    ],
    'Configuración de impresoras': [
      'Confirma que la impresora esté encendida, sin luces de alerta y conectada a la misma red Wi-Fi que tu equipo.',
      'Abre "Impresoras y escáneres" y verifica que no esté marcada la opción "Usar impresora sin conexión".',
    ],
    'Eliminación de malware y virus': [
      'Cierra las pestañas sospechosas sin hacer clic en botones de descarga ni ingresar contraseñas.',
      'Revisa las extensiones instaladas en tu navegador y desactiva las que no reconozcas.',
    ],
    'Recuperación de archivos': [
      'Detén inmediatamente el guardado de archivos nuevos en esa unidad para evitar sobrescribir los datos.',
      'Revisa primero la Papelera de reciclaje y la papelera web de OneDrive si sincronizas documentos.',
    ],
    'Actualizaciones de Windows': [
      'Comprueba que tengas al menos 15 GB libres en el disco C: antes de reintentar Windows Update.',
      'Reinicia el equipo y ejecuta Configuración → Sistema → Solucionar problemas → Windows Update.',
    ],
    'VPN y acceso remoto': [
      'Confirma que tu conexión a internet base funciona antes de iniciar el cliente VPN.',
      'Cierra y vuelve a abrir el cliente VPN verificando si requiere aprobación MFA en tu teléfono.',
    ],
    Otro: [
      'Reinicia el equipo para liberar bloqueos temporales de memoria o servicios.',
      'Anota cualquier mensaje o código exacto de error para acelerar el diagnóstico.',
    ],
  };

  const primaryKey =
    description.trim().length >= 8 ? suggestedCategory : category === 'Otro' ? suggestedCategory : category;
  const resolvedQuestions =
    questionsByCategory[primaryKey] ??
    questionsByCategory[suggestedCategory] ??
    questionsByCategory.Otro;
  const resolvedPreDiag =
    preDiagnosisMap[primaryKey] ??
    preDiagnosisMap[suggestedCategory] ??
    preDiagnosisMap.Otro;
  const resolvedSelfService =
    selfServiceByCategory[primaryKey] ??
    selfServiceByCategory[suggestedCategory] ??
    selfServiceByCategory.Otro;

  const needsRemoteSpecialist =
    suggestedTier !== 'Express $15' ||
    /bsod|pantalla azul|virus|malware|recupera|vpn|rdp|outlook|pst|ost|spooler/i.test(
      description.toLowerCase()
    );

  return {
    followUpQuestions: resolvedQuestions,
    selfServiceSteps: resolvedSelfService,
    needsRemoteSpecialist,
    preDiagnosis: `${resolvedPreDiag} Síntoma reportado: "${description.trim().slice(0, 140)}".`,
    suggestedCategory,
    suggestedTier,
    estimatedMinutes: suggestedTier === 'Express $15' ? 20 : suggestedTier === 'Optimización $29' ? 35 : 45,
    confidenceNote: 'Evaluación inicial generada para acelerar el enlace del técnico asignado.',
    source: 'fallback' as const,
  };
}

function buildFallbackReport(input: {
  ticketCode: string;
  clientName: string;
  category: string;
  osType: string;
  serviceTier: string;
  problemDescription: string;
  rawNotes: string;
  includePreventive?: boolean;
}) {
  const cleanNotes =
    input.rawNotes.trim() ||
    'Se ejecutó diagnóstico integral, corrección de configuración y verificación de estabilidad.';
  const lines = [
    `INFORME TÉCNICO DE CIERRE · ${input.ticketCode}`,
    `Cliente: ${input.clientName} | Plataforma: ${input.osType} | Categoría: ${input.category} | Plan: ${input.serviceTier}`,
    `1. Incidencia Reportada: ${input.problemDescription}`,
    `2. Intervención Realizada: ${cleanNotes}`,
    `3. Validación y Seguridad: Se realizaron pruebas funcionales con el usuario en vivo y se cerró el túnel remoto cifrado sin accesos residuales.`,
  ];
  if (input.includePreventive !== false) {
    lines.push(
      `4. Recomendación Preventiva: Mantener respaldos periódicos y actualizaciones críticas del sistema al día.`
    );
  }
  const report = lines.join('\n');

  return { report, source: 'fallback' as const };
}

function buildFallbackAssistant(input: {
  category: string;
  osType: string;
  problemDescription: string;
}) {
  const isMac = input.osType === 'Mac';
  const stepsByCategory: Record<string, string[]> = {
    'Windows lento o bajo rendimiento': isMac
      ? [
          'Revisar Monitor de Actividad (CPU/Memoria/Disco) y LaunchAgents de terceros.',
          'Verificar espacio libre APFS y reconstruir índice Spotlight si consume >60% CPU.',
          'Ejecutar Primeros Auxilios en Utilidad de Discos si hay bloqueos de lectura.',
        ]
      : [
          'Auditar Administrador de Tareas y deshabilitar programas de inicio innecesarios.',
          'Ejecutar `sfc /scannow`, `DISM /Online /Cleanup-Image /RestoreHealth` y revisar salud SMART.',
          'Limpiar archivos temporales, ajustar memoria virtual y verificar procesos en segundo plano.',
        ],
    'Aplicaciones que no arrancan': isMac
      ? [
          'Revisar registros de fallos en Consola (Crash Reports) y permisos en Privacidad y Seguridad.',
          'Validar caché de preferencias en `~/Library/Preferences` y firma Gatekeeper.',
          'Reparar dependencias o reinstalar versión limpia manteniendo datos del usuario.',
        ]
      : [
          'Inspeccionar Visor de Eventos (Registros de Aplicación) para identificar módulo/DLL con error.',
          'Reparar librerías Microsoft Visual C++ Redistributable y .NET Framework.',
          'Restablecer caché de aplicación en `%AppData%` / `%LocalAppData%` y probar ejecución.',
        ],
    'Pantallazos azules (BSOD)': [
      'Analizar archivos de volcado en `C:\\Windows\\Minidump` para aislar el controlador causante.',
      'Ejecutar `DISM` y `sfc /scannow` y verificar actualizaciones/reversión de drivers críticos.',
      'Comprobar temperatura, salud SMART de almacenamiento y eventos Kernel-Power.',
    ],
    'Problemas de Wi-Fi o red': isMac
      ? [
          'Renovar concesión DHCP y verificar servidores DNS (1.1.1.1 / 8.8.8.8).',
          'Revisar prioridad de orden de servicios de red y perfil Wi-Fi guardado.',
          'Ejecutar prueba de latencia, pérdida de paquetes y trazado de ruta.',
        ]
      : [
          'Ejecutar `ipconfig /flushdns`, `netsh winsock reset` y `netsh int ip reset`.',
          'Validar controlador del adaptador Wi-Fi y deshabilitar ahorro agresivo de energía.',
          'Comprobar puerta de enlace, DNS alternativos y estabilidad de ping.',
        ],
    'Errores de Microsoft 365 y Outlook': isMac
      ? [
          'Limpiar entradas de Microsoft Identity en Acceso a Llaveros (Keychain Access).',
          'Verificar versión de Outlook for Mac y estado de activación Microsoft 365.',
          'Probar perfil limpio y confirmar sincronización Exchange / IMAP.',
        ]
      : [
          'Limpiar credenciales cacheadas en Windows Credential Manager y tokens WAM.',
          'Ejecutar `outlook.exe /safe`, usar ScanPST si aplica o recrear perfil OST.',
          'Validar conectividad TLS 1.2+, registro DNS Autodiscover y licenciamiento 365.',
        ],
    'Configuración de impresoras': isMac
      ? [
          'Verificar estado de CUPS en http://localhost:631 y reiniciar cola de impresión.',
          'Validar conectividad IPP/AirPrint con ping e ipconfig getifaddr en0.',
          'Restablecer sistema de impresión si el controlador presenta errores de filtro.',
        ]
      : [
          'Reiniciar servicio Print Spooler (`net stop spooler && net start spooler`) y limpiar `C:\\Windows\\System32\\spool\\PRINTERS`.',
          'Verificar puerto TCP/IP estándar o WSD en Propiedades de impresora.',
          'Probar página de diagnóstico tras instalar controlador oficial del fabricante.',
        ],
    'Eliminación de malware y virus': isMac
      ? [
          'Auditar `LaunchAgents`, `LaunchDaemons` y perfiles de configuración sospechosos.',
          'Limpiar extensiones maliciosas y políticas forzadas en Safari/Chrome/Edge.',
          'Ejecutar escaneo antimalware y verificar reglas de firewall/DNS.',
        ]
      : [
          'Revisar procesos activos, tareas programadas y entradas Run/RunOnce en el registro.',
          'Ejecutar análisis completo con Microsoft Defender / herramienta de desinfección y limpiar adware.',
          'Restablecer políticas de navegadores, DNS del adaptador y verificar integridad del sistema.',
        ],
    'Recuperación de archivos': [
      'Detener escrituras en la unidad afectada y trabajar en modo solo lectura o hacia unidad destino distinta.',
      'Verificar estado de tabla de particiones, permisos NTFS/APFS o carpetas ocultas.',
      'Ejecutar recuperación controlada de archivos eliminados y validar apertura íntegra de documentos.',
    ],
    'Actualizaciones de Windows': [
      'Detener servicios `wuauserv` y `bits`, limpiar caché `SoftwareDistribution` y `catroot2`.',
      'Ejecutar `DISM /Online /Cleanup-Image /RestoreHealth` y `sfc /scannow`.',
      'Verificar espacio en disco y aplicar o revertir de forma segura el parche conflictivo.',
    ],
    'VPN y acceso remoto': isMac
      ? [
          'Revisar perfiles VPN, certificados y orden de interfaces de red.',
          'Validar resolución DNS dividida (Split DNS) y puertos de salida en firewall.',
          'Probar conexión hacia host interno o cliente RDP tras ajustar MTU.',
        ]
      : [
          'Inspeccionar adaptador virtual TAP/WireGuard/Fortinet y ajustar MTU si el túnel cae.',
          'Verificar reglas de Firewall, servicios de Escritorio Remoto (RDP) y NLA.',
          'Validar rutas estáticas, DNS interno de oficina y prueba de acceso extremo a extremo.',
        ],
    Otro: [
      'Confirmar alcance exacto de la falla y respaldo preventivo de archivos críticos.',
      'Inspeccionar registros de eventos recientes y permisos de usuario local.',
      'Validar funcionamiento completo junto al cliente antes del cierre.',
    ],
  };

  const aliasMap: Record<string, string> = {
    Impresoras: 'Configuración de impresoras',
    'Correo/Office': 'Errores de Microsoft 365 y Outlook',
    'Sistema Operativo/Lentitud': 'Windows lento o bajo rendimiento',
    'Redes/Wi-Fi': 'Problemas de Wi-Fi o red',
  };
  const resolvedKey = aliasMap[input.category] ?? input.category;

  return {
    checklist: stepsByCategory[resolvedKey] ?? stepsByCategory.Otro,
    diagnosticSummary: `Guía rápida para ${input.osType} (${input.category}): priorizar verificación de causa raíz sobre "${input.problemDescription.slice(0, 90)}".`,
    source: 'fallback' as const,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const client = getGeminiClient();
    res.json({
      ok: true,
      geminiConfigured: Boolean(client),
      geminiStatus: geminiKeyStatus,
    });
  });

  app.get('/api/rustdesk/official-download', async (req, res) => {
    const rawOs = String(req.query.os ?? 'Windows');
    const os =
      rawOs === 'Mac' || rawOs === 'Linux' || rawOs === 'Mobile'
        ? rawOs
        : 'Windows';
    const fallbackUrl = 'https://github.com/rustdesk/rustdesk/releases/latest';

    try {
      const response = await fetch(
        'https://api.github.com/repos/rustdesk/rustdesk/releases/latest',
        {
          headers: {
            'User-Agent': 'RemoteSupport365-App',
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) return res.redirect(fallbackUrl);

      const release = (await response.json()) as {
        assets?: Array<{ name: string; browser_download_url: string }>;
      };
      const assets = release.assets ?? [];

      let asset: { name: string; browser_download_url: string } | undefined;
      if (os === 'Mac') {
        asset = assets.find(
          (a) =>
            a.name.endsWith('.dmg') &&
            (a.name.includes('x86_64') || a.name.includes('universal'))
        );
      } else if (os === 'Linux') {
        asset =
          assets.find(
            (a) => a.name.endsWith('.AppImage') && a.name.includes('x86_64')
          ) ??
          assets.find((a) => a.name.endsWith('.deb') && a.name.includes('x86_64'));
      } else if (os === 'Mobile') {
        asset =
          assets.find(
            (a) =>
              a.name.endsWith('.apk') &&
              (a.name.includes('aarch64') || a.name.includes('universal'))
          ) ?? assets.find((a) => a.name.endsWith('.apk'));
      } else {
        asset = assets.find(
          (a) =>
            a.name.endsWith('.exe') &&
            a.name.includes('x86_64') &&
            !a.name.includes('sciter')
        );
      }

      return res.redirect(asset ? asset.browser_download_url : fallbackUrl);
    } catch {
      return res.redirect(fallbackUrl);
    }
  });

  app.post('/api/ai/receptionist', async (req, res) => {
    const category = String(req.body?.category ?? 'Otro');
    const osType = String(req.body?.osType ?? 'Windows');
    const description = String(req.body?.description ?? '');
    const followUpAnswers = Array.isArray(req.body?.followUpAnswers)
      ? req.body.followUpAnswers
      : [];

    const ai = getGeminiClient();
    if (!ai) {
      res.json(buildFallbackReceptionist({ category, osType, description }));
      return;
    }

    try {
      const fallbackBaseline = classifyLaunchScenario(category, description);
      const prompt = [
        `Eres Asistente Remote 365 (AI Receptionist), especialista senior y empático en triaje de soporte técnico IT remoto.`,
        `Prioriza siempre el síntoma real escrito por el usuario por encima de la categoría inicial.`,
        `NUNCA pidas contraseñas ni códigos de acceso. Solo brinda guía paso a paso segura.`,
        `Categoría inicial indicada: ${category}`,
        `Sistema Operativo: ${osType}`,
        `Descripción del usuario: ${description}`,
        followUpAnswers.length > 0
          ? `Respuestas adicionales del usuario: ${JSON.stringify(followUpAnswers)}`
          : '',
        `Catálogo oficial de 10 servicios de lanzamiento:`,
        `- Express $15: "Aplicaciones que no arrancan", "Problemas de Wi-Fi o red", "Errores de Microsoft 365 y Outlook", "Configuración de impresoras"`,
        `- Optimización $29: "Windows lento o bajo rendimiento", "Eliminación de malware y virus", "Actualizaciones de Windows"`,
        `- Avanzado $39: "Pantallazos azules (BSOD)", "Recuperación de archivos", "VPN y acceso remoto"`,
        `Responde en español claro, cercano y sin jerga innecesaria.`,
        `Incluye 2 a 3 preguntas breves de comprobación segura (ej. "¿Usas Outlook clásico o el nuevo Outlook?") y 2 a 3 pasos rápidos de autoservicio seguros que el usuario pueda probar antes de escalar.`,
        `El campo suggestedCategory DEBE ser exactamente una de las 10 categorías oficiales listadas arriba.`,
        `El campo suggestedTier DEBE ser exactamente uno de: "Express $15", "Optimización $29", o "Avanzado $39".`,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await withGeminiRetry(() =>
        ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                followUpQuestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description:
                    '2 a 3 preguntas breves de comprobación segura para precisar el problema.',
                },
                selfServiceSteps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description:
                    '2 a 3 pasos rápidos y seguros de autoservicio que el usuario puede verificar sin riesgo.',
                },
                needsRemoteSpecialist: {
                  type: Type.BOOLEAN,
                  description:
                    'Indica si el problema probablemente requiere intervención remota de un especialista.',
                },
                preDiagnosis: {
                  type: Type.STRING,
                  description:
                    'Pre-diagnóstico técnico claro y empático en 2 a 3 líneas basado en el síntoma real.',
                },
                suggestedCategory: {
                  type: Type.STRING,
                  description: 'Una de las 10 categorías oficiales del catálogo.',
                },
                suggestedTier: {
                  type: Type.STRING,
                  description:
                    'Exactamente "Express $15", "Optimización $29", o "Avanzado $39".',
                },
                estimatedMinutes: {
                  type: Type.INTEGER,
                  description: 'Duración estimada en minutos (15 a 60).',
                },
                confidenceNote: {
                  type: Type.STRING,
                  description: 'Nota breve de confianza y preparación previa.',
                },
              },
              required: [
                'followUpQuestions',
                'selfServiceSteps',
                'needsRemoteSpecialist',
                'preDiagnosis',
                'suggestedCategory',
                'suggestedTier',
                'estimatedMinutes',
                'confidenceNote',
              ],
            },
          },
        })
      );

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        followUpQuestions?: string[];
        selfServiceSteps?: string[];
        needsRemoteSpecialist?: boolean;
        preDiagnosis?: string;
        suggestedCategory?: string;
        suggestedTier?: string;
        estimatedMinutes?: number;
        confidenceNote?: string;
      };

      const fallbackObj = buildFallbackReceptionist({ category, osType, description });
      const validTiers = ['Express $15', 'Optimización $29', 'Avanzado $39'] as const;
      const suggestedTier = validTiers.includes(
        parsed.suggestedTier as (typeof validTiers)[number]
      )
        ? (parsed.suggestedTier as (typeof validTiers)[number])
        : fallbackBaseline.suggestedTier;

      const suggestedCategory = LAUNCH_CATEGORIES.includes(
        parsed.suggestedCategory as (typeof LAUNCH_CATEGORIES)[number]
      )
        ? parsed.suggestedCategory!
        : fallbackBaseline.suggestedCategory;

      res.json({
        followUpQuestions:
          parsed.followUpQuestions?.slice(0, 3) ?? fallbackObj.followUpQuestions,
        selfServiceSteps:
          parsed.selfServiceSteps?.slice(0, 3) ?? fallbackObj.selfServiceSteps,
        needsRemoteSpecialist:
          typeof parsed.needsRemoteSpecialist === 'boolean'
            ? parsed.needsRemoteSpecialist
            : fallbackObj.needsRemoteSpecialist,
        preDiagnosis: parsed.preDiagnosis ?? fallbackObj.preDiagnosis,
        suggestedCategory,
        suggestedTier,
        estimatedMinutes: parsed.estimatedMinutes ?? 25,
        confidenceNote:
          parsed.confidenceNote ??
          'Pre-diagnóstico generado por AI Receptionist (Gemini).',
        source: 'gemini',
      });
    } catch (error) {
      const code =
        error instanceof Error ? error.message : 'GEMINI_UNAVAILABLE';
      console.info(`[AI] Receptionist fallback active (${code}).`);
      res.json(buildFallbackReceptionist({ category, osType, description }));
    }
  });

  app.post('/api/ai/report', async (req, res) => {
    const ticketCode = String(req.body?.ticketCode ?? 'RS-0000');
    const clientName = String(req.body?.clientName ?? 'Cliente');
    const category = String(req.body?.category ?? 'Otro');
    const osType = String(req.body?.osType ?? 'Windows');
    const serviceTier = String(req.body?.serviceTier ?? 'Express $15');
    const problemDescription = String(req.body?.problemDescription ?? '');
    const aiDiagnosis = String(req.body?.aiDiagnosis ?? '');
    const rawNotes = String(req.body?.rawNotes ?? '');
    const includePreventive = req.body?.includePreventive !== false;

    const ai = getGeminiClient();
    if (!ai) {
      res.json(
        buildFallbackReport({
          ticketCode,
          clientName,
          category,
          osType,
          serviceTier,
          problemDescription,
          rawNotes,
          includePreventive,
        })
      );
      return;
    }

    try {
      const prompt = [
        `Eres AI Report Generator de Remote Support 365. Redacta un informe técnico formal de cierre de ticket en español.`,
        `Ticket: ${ticketCode}`,
        `Cliente: ${clientName}`,
        `SO: ${osType} | Categoría: ${category} | Servicio: ${serviceTier}`,
        `Problema reportado: ${problemDescription}`,
        `Diagnóstico previo: ${aiDiagnosis}`,
        `Notas del técnico: ${rawNotes || 'Resolución completa ejecutada en vivo.'}`,
        includePreventive
          ? `Estructura el texto limpio en 4 puntos breves (Incidencia, Intervención, Validación de seguridad, Recomendación preventiva), máximo 130 palabras, sin markdown excesivo.`
          : `Estructura el texto limpio en 3 puntos breves (Incidencia, Intervención, Validación de seguridad) sin agregar recomendaciones preventivas, máximo 110 palabras, sin markdown excesivo.`,
      ].join('\n');

      const response = await withGeminiRetry(() =>
        ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        })
      );

      const report = (response.text ?? '').trim();
      if (!report) {
        res.json(
          buildFallbackReport({
            ticketCode,
            clientName,
            category,
            osType,
            serviceTier,
            problemDescription,
            rawNotes,
            includePreventive,
          })
        );
        return;
      }

      res.json({ report, source: 'gemini' });
    } catch (error) {
      const code =
        error instanceof Error ? error.message : 'GEMINI_UNAVAILABLE';
      console.info(`[AI] Report fallback active (${code}).`);
      res.json(
        buildFallbackReport({
          ticketCode,
          clientName,
          category,
          osType,
          serviceTier,
          problemDescription,
          rawNotes,
          includePreventive,
        })
      );
    }
  });

  app.post('/api/ai/assistant', async (req, res) => {
    const category = String(req.body?.category ?? 'Otro');
    const osType = String(req.body?.osType ?? 'Windows');
    const problemDescription = String(req.body?.problemDescription ?? '');

    const ai = getGeminiClient();
    if (!ai) {
      res.json(buildFallbackAssistant({ category, osType, problemDescription }));
      return;
    }

    try {
      const response = await withGeminiRetry(() =>
        ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Eres AI Technician Assistant. Para un equipo ${osType} con falla en "${category}": "${problemDescription}", entrega 3 pasos técnicos concretos y un resumen breve en español.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                checklist: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                diagnosticSummary: {
                  type: Type.STRING,
                },
              },
              required: ['checklist', 'diagnosticSummary'],
            },
          },
        })
      );

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        checklist?: string[];
        diagnosticSummary?: string;
      };
      res.json({
        checklist:
          parsed.checklist?.slice(0, 4) ??
          buildFallbackAssistant({ category, osType, problemDescription }).checklist,
        diagnosticSummary:
          parsed.diagnosticSummary ??
          buildFallbackAssistant({ category, osType, problemDescription }).diagnosticSummary,
        source: 'gemini',
      });
    } catch (error) {
      const code =
        error instanceof Error ? error.message : 'GEMINI_UNAVAILABLE';
      console.info(`[AI] Assistant fallback active (${code}).`);
      res.json(buildFallbackAssistant({ category, osType, problemDescription }));
    }
  });

  function getPublicBaseUrl(req: express.Request): string {
    const originHeader = req.headers.origin;
    if (
      typeof originHeader === 'string' &&
      /^https?:\/\/[^/\s]+$/i.test(originHeader.trim())
    ) {
      return originHeader.trim().replace(/\/+$/, '');
    }
    const envUrl = process.env.APP_URL?.trim();
    if (envUrl && envUrl !== 'MY_APP_URL' && /^https?:\/\//i.test(envUrl)) {
      return envUrl.replace(/\/+$/, '');
    }
    const protoHeader = req.headers['x-forwarded-proto'];
    const proto =
      typeof protoHeader === 'string' && protoHeader.length > 0
        ? protoHeader.split(',')[0].trim()
        : req.protocol || 'http';
    const forwardedHost = req.headers['x-forwarded-host'];
    const host =
      (typeof forwardedHost === 'string' && forwardedHost.split(',')[0].trim()) ||
      req.get('host') ||
      `localhost:${PORT}`;
    return `${proto}://${host}`;
  }

  function normalizeSecret(raw: string | undefined): string | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('YOUR_')) return null;
    return trimmed;
  }

  function getPayPalBaseUrl(): string {
    return process.env.PAYPAL_MODE?.trim().toLowerCase() === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  async function fetchPayPalAccessToken(
    clientId: string,
    clientSecret: string
  ): Promise<string> {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!tokenRes.ok) {
      const detail = await tokenRes.text().catch(() => '');
      throw new Error(`PayPal OAuth2 error (${tokenRes.status}): ${detail}`);
    }
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) {
      throw new Error('PayPal OAuth2 response missing access_token');
    }
    return tokenJson.access_token;
  }

  app.post('/api/payments/stripe/create-session', async (req, res) => {
    const { amountUsd, ticketCode, customerEmail, serviceLabel } = req.body ?? {};
    const parsedAmount = Number(amountUsd ?? 15);
    const safeAmount =
      Number.isFinite(parsedAmount) && parsedAmount > 0
        ? Math.round(parsedAmount * 100) / 100
        : 15;
    const cleanTicketCode = String(ticketCode ?? 'RS-0000')
      .trim()
      .toUpperCase()
      .slice(0, 32);

    const stripeKey = normalizeSecret(process.env.STRIPE_SECRET_KEY);
    if (!stripeKey) {
      res.json({
        success: true,
        mode: 'sandbox',
        verified: true,
        message: 'Stripe simulated successfully in sandbox preview.',
        chargeId: `ch_sandbox_${Math.random().toString(36).slice(2, 10)}`,
        amountUsd: safeAmount,
      });
      return;
    }

    try {
      const stripe = new Stripe(stripeKey);
      const baseUrl = getPublicBaseUrl(req);
      const encodedCode = encodeURIComponent(cleanTicketCode);
      const unitAmountCents = Math.max(50, Math.round(safeAmount * 100));
      const cleanEmail =
        typeof customerEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customerEmail.trim())
          ? customerEmail.trim()
          : undefined;

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: cleanEmail,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Remote Support 365 · Ticket ${cleanTicketCode}`,
                description:
                  typeof serviceLabel === 'string' && serviceLabel.trim()
                    ? serviceLabel.trim()
                    : 'Asistencia técnica IT remota supervisada',
              },
              unit_amount: unitAmountCents,
            },
            quantity: 1,
          },
        ],
        metadata: {
          ticketCode: cleanTicketCode,
        },
        success_url: `${baseUrl}/sesion/${encodedCode}?payment=success&gateway=stripe&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/sesion/${encodedCode}?payment=canceled&gateway=stripe`,
      });

      res.json({
        success: true,
        mode: 'live',
        verified: false,
        sessionId: session.id,
        url: session.url,
        amountUsd: safeAmount,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? `Error al crear sesión en Stripe: ${error.message}`
            : 'Error al crear sesión en Stripe.',
      });
    }
  });

  app.get('/api/payments/stripe/verify-session', async (req, res) => {
    const sessionId = String(req.query.session_id ?? '').trim();
    if (!sessionId) {
      res.status(400).json({
        success: false,
        verified: false,
        error: 'Falta el parámetro session_id.',
      });
      return;
    }

    const stripeKey = normalizeSecret(process.env.STRIPE_SECRET_KEY);
    if (!stripeKey) {
      res.status(400).json({
        success: false,
        verified: false,
        error: 'Stripe no está configurado en el servidor.',
      });
      return;
    }

    try {
      const stripe = new Stripe(stripeKey);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const verified = session.payment_status === 'paid';
      res.json({
        success: verified,
        verified,
        payment_status: session.payment_status,
        sessionId: session.id,
        ticketCode: session.metadata?.ticketCode ?? null,
        amountUsd:
          typeof session.amount_total === 'number'
            ? session.amount_total / 100
            : null,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        verified: false,
        error:
          error instanceof Error
            ? `No se pudo verificar la sesión de Stripe: ${error.message}`
            : 'No se pudo verificar la sesión de Stripe.',
      });
    }
  });

  app.post('/api/payments/paypal/create-order', async (req, res) => {
    const { amountUsd, ticketCode, serviceLabel } = req.body ?? {};
    const parsedAmount = Number(amountUsd ?? 15);
    const safeAmount =
      Number.isFinite(parsedAmount) && parsedAmount > 0
        ? Math.round(parsedAmount * 100) / 100
        : 15;
    const cleanTicketCode = String(ticketCode ?? 'RS-0000')
      .trim()
      .toUpperCase()
      .slice(0, 32);

    const paypalClientId = normalizeSecret(process.env.PAYPAL_CLIENT_ID);
    const paypalClientSecret = normalizeSecret(process.env.PAYPAL_CLIENT_SECRET);
    if (!paypalClientId || !paypalClientSecret) {
      res.json({
        success: true,
        mode: 'sandbox',
        orderId: `PAYPAL_SANDBOX_${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        amountUsd: safeAmount,
      });
      return;
    }

    try {
      const accessToken = await fetchPayPalAccessToken(
        paypalClientId,
        paypalClientSecret
      );
      const baseUrl = getPublicBaseUrl(req);
      const encodedCode = encodeURIComponent(cleanTicketCode);
      const orderRes = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: cleanTicketCode,
              description:
                typeof serviceLabel === 'string' && serviceLabel.trim()
                  ? `Remote Support 365 · ${serviceLabel.trim()}`
                  : `Remote Support 365 · Ticket ${cleanTicketCode}`,
              amount: {
                currency_code: 'USD',
                value: safeAmount.toFixed(2),
              },
            },
          ],
          application_context: {
            brand_name: 'Remote Support 365',
            landing_page: 'LOGIN',
            user_action: 'PAY_NOW',
            return_url: `${baseUrl}/sesion/${encodedCode}?payment=success&gateway=paypal`,
            cancel_url: `${baseUrl}/sesion/${encodedCode}?payment=canceled&gateway=paypal`,
          },
        }),
      });

      const orderData = (await orderRes.json()) as {
        id?: string;
        links?: Array<{ rel?: string; href?: string }>;
        message?: string;
      };
      if (!orderRes.ok || !orderData.id) {
        res.status(502).json({
          success: false,
          error: orderData.message ?? 'PayPal rechazó la creación de la orden.',
        });
        return;
      }

      const approvalUrl =
        orderData.links?.find((link) => link.rel === 'approve')?.href ?? null;
      res.json({
        success: true,
        mode: 'live',
        verified: false,
        orderId: orderData.id,
        approvalUrl,
        amountUsd: safeAmount,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? `Error al crear orden PayPal: ${error.message}`
            : 'Error al crear orden PayPal.',
      });
    }
  });

  app.post('/api/payments/paypal/capture-order', async (req, res) => {
    const orderId = String(req.body?.orderId ?? '').trim();
    if (!orderId) {
      res.status(400).json({
        success: false,
        verified: false,
        error: 'Falta el parámetro orderId.',
      });
      return;
    }

    const paypalClientId = normalizeSecret(process.env.PAYPAL_CLIENT_ID);
    const paypalClientSecret = normalizeSecret(process.env.PAYPAL_CLIENT_SECRET);

    if (!paypalClientId || !paypalClientSecret) {
      if (!orderId.startsWith('PAYPAL_SANDBOX_')) {
        res.status(400).json({
          success: false,
          verified: false,
          error: 'Credenciales de PayPal no configuradas en el servidor.',
        });
        return;
      }
      res.json({
        success: true,
        mode: 'sandbox',
        verified: true,
        status: 'COMPLETED',
        captureId: `cap_sandbox_${Math.random().toString(36).slice(2, 10)}`,
        orderId,
      });
      return;
    }

    try {
      const accessToken = await fetchPayPalAccessToken(
        paypalClientId,
        paypalClientSecret
      );
      const captureRes = await fetch(
        `${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const captureData = (await captureRes.json()) as {
        id?: string;
        status?: string;
        message?: string;
        purchase_units?: Array<{
          payments?: {
            captures?: Array<{ id?: string; status?: string }>;
          };
        }>;
      };

      const completed = captureData.status === 'COMPLETED';
      const captureId =
        captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;

      if (!captureRes.ok || !completed) {
        res.status(402).json({
          success: false,
          verified: false,
          status: captureData.status ?? 'FAILED',
          error:
            captureData.message ??
            'La captura de PayPal no fue completada.',
        });
        return;
      }

      res.json({
        success: true,
        mode: 'live',
        verified: true,
        status: captureData.status,
        captureId,
        orderId: captureData.id ?? orderId,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        verified: false,
        error:
          error instanceof Error
            ? `Error al capturar orden PayPal: ${error.message}`
            : 'Error al capturar orden PayPal.',
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Remote Support 365 server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
