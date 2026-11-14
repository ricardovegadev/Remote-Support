import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim().length < 10) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildFallbackReceptionist(input: {
  category: string;
  osType: string;
  description: string;
}) {
  const { category, osType, description } = input;
  const lower = description.toLowerCase();

  let suggestedTier: 'Express $25' | 'Optimización $40' | 'Avanzado $55' = 'Express $25';
  if (
    lower.includes('lento') ||
    lower.includes('cpu') ||
    lower.includes('disco') ||
    lower.includes('actualiz') ||
    category === 'Sistema Operativo/Lentitud'
  ) {
    suggestedTier = 'Optimización $40';
  } else if (
    lower.includes('vpn') ||
    lower.includes('servidor') ||
    lower.includes('respaldo') ||
    lower.includes('migra') ||
    lower.includes('dominio')
  ) {
    suggestedTier = 'Avanzado $55';
  }

  const questionsByCategory: Record<string, string[]> = {
    Impresoras: [
      '¿La impresora está conectada por cable USB directo o mediante Wi-Fi/red local?',
      '¿El error aparece al enviar desde cualquier aplicación o solo desde PDF/navegador?',
      '¿Hubo un cambio reciente de router o actualización del sistema operativo?',
    ],
    'Correo/Office': [
      '¿El problema ocurre en Outlook de escritorio o también en el navegador web (OWA)?',
      '¿Aparece un código de error específico o solicitud repetida de contraseña MFA?',
      '¿Es una cuenta Microsoft 365 corporativa, Google Workspace o IMAP/POP?',
    ],
    'Sistema Operativo/Lentitud': [
      '¿La lentitud se nota al encender el equipo o al abrir aplicaciones pesadas?',
      '¿El ventilador suena fuerte o el espacio libre en disco es menor al 15%?',
      '¿Instalaste algún software o actualización reciente antes de notar el problema?',
    ],
    'Redes/Wi-Fi': [
      '¿El corte de conexión ocurre en todos tus dispositivos o únicamente en este equipo?',
      '¿Utilizas cliente VPN corporativo (WireGuard, Fortinet, Cisco, OpenVPN)?',
      '¿Tienes acceso a sitios web externos o falla únicamente la red interna?',
    ],
    Otro: [
      '¿El incidente bloquea por completo tu trabajo actual o es intermitente?',
      '¿Necesitas respaldo previo de archivos antes de aplicar cambios en el sistema?',
      '¿Tienes permisos de administrador local en el equipo?',
    ],
  };

  const preDiagnosisMap: Record<string, string> = {
    Impresoras: `Pre-diagnóstico AI Receptionist (${osType}): Posible bloqueo en cola de impresión (spooler), desajuste de puerto IPP/TCP o controlador desactualizado.`,
    'Correo/Office': `Pre-diagnóstico AI Receptionist (${osType}): Probable corrupción de caché de credenciales Modern Auth, perfil PST/OST desincronizado o conflicto de complemento.`,
    'Sistema Operativo/Lentitud': `Pre-diagnóstico AI Receptionist (${osType}): Saturación de procesos en segundo plano, indexación o servicios de inicio que requieren optimización controlada.`,
    'Redes/Wi-Fi': `Pre-diagnóstico AI Receptionist (${osType}): Inestabilidad en adaptador de red, resolución DNS o parámetros MTU de túnel VPN.`,
    Otro: `Pre-diagnóstico AI Receptionist (${osType}): Incidencia de configuración de software o permisos locales apta para resolución remota supervisada.`,
  };

  return {
    followUpQuestions: questionsByCategory[category] ?? questionsByCategory.Otro,
    preDiagnosis: `${preDiagnosisMap[category] ?? preDiagnosisMap.Otro} Síntoma reportado: "${description.trim().slice(0, 140)}".`,
    suggestedTier,
    estimatedMinutes: suggestedTier === 'Express $25' ? 20 : suggestedTier === 'Optimización $40' ? 35 : 45,
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
    Impresoras: isMac
      ? [
          'Verificar estado de CUPS en http://localhost:631 y reiniciar cola de impresión.',
          'Validar conectividad IPP/AirPrint con ping e ipconfig getifaddr en0.',
          'Restablecer sistema de impresión si el controlador presenta errores de filtro.',
        ]
      : [
          'Reiniciar servicio Print Spooler (`net stop spooler && net start spooler`) y limpiar C:\\Windows\\System32\\spool\\PRINTERS.',
          'Verificar puerto TCP/IP estándar o WSD en Propiedades de impresora.',
          'Probar página de diagnóstico tras reinstalar controlador oficial.',
        ],
    'Correo/Office': isMac
      ? [
          'Limpiar entradas de Microsoft Identity en Acceso a Llaveros (Keychain Access).',
          'Verificar versión de Outlook for Mac y estado de licencia Office.',
          'Probar perfil limpio y confirmar sincronización IMAP/Exchange.',
        ]
      : [
          'Limpiar credenciales cacheadas en Windows Credential Manager y tokens WAM.',
          'Ejecutar `outlook.exe /safe` o reconstruir perfil de correo si el archivo OST está dañado.',
          'Validar conectividad TLS y DNS Autodiscover.',
        ],
    'Sistema Operativo/Lentitud': isMac
      ? [
          'Revisar Monitor de Actividad (CPU/Memoria/Disco) y LaunchAgents de terceros.',
          'Verificar espacio libre APFS y reconstruir índice Spotlight si consume >60% CPU.',
          'Ejecutar Primeros Auxilios en Utilidad de Discos si hay bloqueos de lectura.',
        ]
      : [
          'Auditar Administrador de Tareas y deshabilitar programas de inicio innecesarios.',
          'Ejecutar `sfc /scannow` y comprobar salud de almacenamiento SMART.',
          'Limpiar archivos temporales y validar cola de Windows Update.',
        ],
    'Redes/Wi-Fi': isMac
      ? [
          'Renovar concesión DHCP y verificar servidores DNS (1.1.1.1 / 8.8.8.8).',
          'Revisar interfaces VPN y prioridad de orden de servicios de red.',
          'Ejecutar prueba de latencia y pérdida de paquetes.',
        ]
      : [
          'Ejecutar `ipconfig /flushdns`, `netsh winsock reset` y validar puerta de enlace.',
          'Inspeccionar adaptador TAP/WireGuard y ajustar MTU si la VPN cae.',
          'Comprobar controlador Wi-Fi y modo de ahorro de energía del adaptador.',
        ],
    Otro: [
      'Confirmar alcance exacto de la falla y respaldo preventivo de archivos críticos.',
      'Inspeccionar registros de eventos recientes y permisos de usuario local.',
      'Validar funcionamiento completo junto al cliente antes del cierre.',
    ],
  };

  return {
    checklist: stepsByCategory[input.category] ?? stepsByCategory.Otro,
    diagnosticSummary: `Guía rápida para ${input.osType} (${input.category}): priorizar verificación de causa raíz sobre "${input.problemDescription.slice(0, 90)}".`,
    source: 'fallback' as const,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, geminiConfigured: Boolean(getGeminiClient()) });
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
      const prompt = [
        `Eres AI Receptionist de Remote Support 365, especialista senior en triaje de soporte técnico IT remoto.`,
        `Categoría: ${category}`,
        `Sistema Operativo: ${osType}`,
        `Descripción del cliente: ${description}`,
        followUpAnswers.length > 0
          ? `Respuestas adicionales del cliente: ${JSON.stringify(followUpAnswers)}`
          : '',
        `Responde en español profesional y conciso.`,
        `El campo suggestedTier DEBE ser exactamente uno de: "Express $25", "Optimización $40", o "Avanzado $55".`,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              followUpQuestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 preguntas breves de triaje técnico para precisar el problema.',
              },
              preDiagnosis: {
                type: Type.STRING,
                description: 'Pre-diagnóstico técnico claro en 2 a 3 líneas para el técnico asignado.',
              },
              suggestedTier: {
                type: Type.STRING,
                description: 'Exactamente "Express $25", "Optimización $40", o "Avanzado $55".',
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
              'preDiagnosis',
              'suggestedTier',
              'estimatedMinutes',
              'confidenceNote',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        followUpQuestions?: string[];
        preDiagnosis?: string;
        suggestedTier?: string;
        estimatedMinutes?: number;
        confidenceNote?: string;
      };

      const validTiers = ['Express $25', 'Optimización $40', 'Avanzado $55'] as const;
      const suggestedTier = validTiers.includes(
        parsed.suggestedTier as (typeof validTiers)[number]
      )
        ? (parsed.suggestedTier as (typeof validTiers)[number])
        : 'Express $25';

      res.json({
        followUpQuestions:
          parsed.followUpQuestions?.slice(0, 3) ??
          buildFallbackReceptionist({ category, osType, description }).followUpQuestions,
        preDiagnosis:
          parsed.preDiagnosis ??
          buildFallbackReceptionist({ category, osType, description }).preDiagnosis,
        suggestedTier,
        estimatedMinutes: parsed.estimatedMinutes ?? 25,
        confidenceNote:
          parsed.confidenceNote ??
          'Pre-diagnóstico generado por AI Receptionist (Gemini).',
        source: 'gemini',
      });
    } catch (error) {
      console.warn('Gemini AI Receptionist fallback triggered:', error);
      res.json(buildFallbackReceptionist({ category, osType, description }));
    }
  });

  app.post('/api/ai/report', async (req, res) => {
    const ticketCode = String(req.body?.ticketCode ?? 'RS-0000');
    const clientName = String(req.body?.clientName ?? 'Cliente');
    const category = String(req.body?.category ?? 'Otro');
    const osType = String(req.body?.osType ?? 'Windows');
    const serviceTier = String(req.body?.serviceTier ?? 'Express $25');
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

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

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
      console.warn('Gemini AI Report fallback triggered:', error);
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
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Eres AI Technician Assistant. Para un equipo ${osType} con falla en "${category}": "${problemDescription}", entrega 3 pasos técnicos concretos y un resumen breve en español.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
      });

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
      console.warn('Gemini AI Assistant fallback triggered:', error);
      res.json(buildFallbackAssistant({ category, osType, problemDescription }));
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
