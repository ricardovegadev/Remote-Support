import type { AssessmentRecommendation } from '../types/support';

export type AssessmentDimension = 'technical' | 'attitude';

export interface TechnicianAssessmentOption {
  id: string;
  label: string;
}

export interface TechnicianAssessmentQuestion {
  id: string;
  dimension: AssessmentDimension;
  topic: string;
  prompt: string;
  options: TechnicianAssessmentOption[];
  correctOptionId: string;
}

export interface TechnicianAssessmentResult {
  technicalScore: number;
  attitudeScore: number;
  totalScore: number;
  correctTechnical: number;
  totalTechnical: number;
  correctAttitude: number;
  totalAttitude: number;
  unansweredCount: number;
  recommendation: AssessmentRecommendation;
}

export const ASSESSMENT_DURATION_SECONDS = 900;

export const TECHNICIAN_ASSESSMENT_QUESTIONS: TechnicianAssessmentQuestion[] = [
  {
    id: 'tech-1',
    dimension: 'technical',
    topic: 'Windows y Rendimiento',
    prompt:
      'Un cliente reporta que su PC con Windows 11 tarda más de 4 minutos en iniciar y el disco aparece al 100 %. ¿Cuál es el primer paso diagnóstico más seguro y efectivo?',
    options: [
      {
        id: 'a',
        label:
          'Formatear inmediatamente el equipo para ahorrar tiempo y reinstalar Windows desde cero.',
      },
      {
        id: 'b',
        label:
          'Auditar el Administrador de Tareas (procesos, uso de disco y programas de inicio) y revisar servicios o actualizaciones pendientes antes de modificar configuraciones críticas.',
      },
      {
        id: 'c',
        label:
          'Desactivar permanentemente Windows Defender y el firewall para liberar recursos.',
      },
      {
        id: 'd',
        label:
          'Eliminar entradas aleatorias del Registro de Windows (regedit) sin respaldo previo.',
      },
    ],
    correctOptionId: 'b',
  },
  {
    id: 'tech-2',
    dimension: 'technical',
    topic: 'Microsoft 365 y Outlook',
    prompt:
      'Outlook en Windows solicita la contraseña repetidamente y no sincroniza correos de Microsoft 365, aunque el usuario sí puede ingresar vía web. ¿Qué acción resuelve la causa raíz sin arriesgar sus datos locales?',
    options: [
      {
        id: 'a',
        label:
          'Eliminar directamente los archivos PST/OST del disco sin verificar respaldo ni configuración.',
      },
      {
        id: 'b',
        label:
          'Pedirle al cliente que dicte su contraseña para iniciar sesión desde tu propio navegador.',
      },
      {
        id: 'c',
        label:
          'Limpiar credenciales obsoletas en el Administrador de Credenciales de Windows, verificar la caché de Modern Auth/WAM y reparar el perfil de Outlook conservando los datos locales.',
      },
      {
        id: 'd',
        label:
          'Desinstalar toda la suite de Microsoft 365 como única opción sin diagnosticar el perfil.',
      },
    ],
    correctOptionId: 'c',
  },
  {
    id: 'tech-3',
    dimension: 'technical',
    topic: 'Redes y Wi-Fi',
    prompt:
      'Un equipo aparece conectado al Wi-Fi de la oficina pero muestra "Sin acceso a internet", mientras otros dispositivos en la misma red sí navegan. ¿Qué secuencia técnica corresponde?',
    options: [
      {
        id: 'a',
        label:
          'Verificar la dirección IP asignada (DHCP vs. APIPA 169.254.x.x), probar resolución DNS, ejecutar ipconfig /flushdns y revisar el estado del adaptador de red.',
      },
      {
        id: 'b',
        label:
          'Indicar inmediatamente que el proveedor de internet tiene una caída general y cerrar el ticket.',
      },
      {
        id: 'c',
        label:
          'Reinstalar el sistema operativo completo porque el módulo Wi-Fi está dañado.',
      },
      {
        id: 'd',
        label:
          'Deshabilitar el cifrado WPA2/WPA3 del router del cliente para facilitar la conexión.',
      },
    ],
    correctOptionId: 'a',
  },
  {
    id: 'tech-4',
    dimension: 'technical',
    topic: 'Impresoras',
    prompt:
      'Una impresora de red aparece "Sin conexión" y varios documentos quedan bloqueados en la cola de impresión en Windows. ¿Qué procedimiento estándar aplicas?',
    options: [
      {
        id: 'a',
        label:
          'Reiniciar el equipo repetidas veces sin tocar la cola ni verificar la conectividad.',
      },
      {
        id: 'b',
        label:
          'Detener y reiniciar el servicio Cola de impresión (Print Spooler), depurar trabajos atascados, comprobar el puerto TCP/IP activo y validar el controlador oficial.',
      },
      {
        id: 'c',
        label:
          'Instalar un paquete de controladores de terceros de origen no verificado.',
      },
      {
        id: 'd',
        label:
          'Cambiar la impresora a puerto LPT1 local aunque esté conectada por red.',
      },
    ],
    correctOptionId: 'b',
  },
  {
    id: 'tech-5',
    dimension: 'technical',
    topic: 'Seguridad y Malware',
    prompt:
      'El navegador del cliente muestra ventanas emergentes invasivas de falso antivirus y redirecciones constantes. ¿Cuál es el protocolo seguro de remediación?',
    options: [
      {
        id: 'a',
        label:
          'Hacer clic en el botón "Reparar ahora" de la ventana emergente para instalar el limpiador ofrecido.',
      },
      {
        id: 'b',
        label:
          'Desactivar la protección en tiempo real de Windows Security para que no muestre alertas.',
      },
      {
        id: 'c',
        label:
          'Auditar y eliminar extensiones maliciosas, revocar permisos de notificaciones abusivas, restablecer configuración del navegador y ejecutar un análisis antimalware actualizado.',
      },
      {
        id: 'd',
        label:
          'Solo borrar el historial de navegación sin revisar extensiones ni programas instalados.',
      },
    ],
    correctOptionId: 'c',
  },
  {
    id: 'att-1',
    dimension: 'attitude',
    topic: 'Confidencialidad (NDA)',
    prompt:
      'Durante una sesión remota, se requiere iniciar sesión en el correo corporativo o portal bancario del cliente para verificar un ajuste. El cliente ofrece dictarte su contraseña por el chat. ¿Cómo actúas?',
    options: [
      {
        id: 'a',
        label:
          'La anotas temporalmente en tu bloc de notas para agilizar el soporte y luego la borras.',
      },
      {
        id: 'b',
        label:
          'Le indicas amablemente que nunca debe compartir contraseñas ni códigos 2FA, y le pides que la ingrese personalmente en su equipo mientras supervisa la sesión.',
      },
      {
        id: 'c',
        label:
          'Le pides que envíe una foto de sus credenciales por correo electrónico para dejar constancia.',
      },
      {
        id: 'd',
        label:
          'Aceptas la contraseña solo si el cliente autoriza verbalmente en el chat.',
      },
    ],
    correctOptionId: 'b',
  },
  {
    id: 'att-2',
    dimension: 'attitude',
    topic: 'Protección de Datos (NDA)',
    prompt:
      'Al conectarte remotamente notas que el cliente tiene abierta una hoja de cálculo con nóminas y facturas confidenciales de su empresa. ¿Cuál es la conducta obligatoria según el NDA interno?',
    options: [
      {
        id: 'a',
        label:
          'Tomar una captura de pantalla como evidencia general del estado inicial del escritorio.',
      },
      {
        id: 'b',
        label:
          'Copiar el archivo a tu carpeta temporal por si se pierde durante el mantenimiento.',
      },
      {
        id: 'c',
        label:
          'No capturar ni copiar nada; pedir permiso al cliente para minimizar o cerrar las ventanas personales antes de trabajar estrictamente en la incidencia reportada.',
      },
      {
        id: 'd',
        label:
          'Revisar el documento brevemente para confirmar si está relacionado con el rendimiento del PC.',
      },
    ],
    correctOptionId: 'c',
  },
  {
    id: 'att-3',
    dimension: 'attitude',
    topic: 'No Elusión (NDA)',
    prompt:
      'Al resolver exitosamente un caso, el cliente queda muy satisfecho y te pide tu WhatsApp personal para contratarte directamente la próxima vez y evitar comisiones. ¿Qué respondes?',
    options: [
      {
        id: 'a',
        label:
          'Aceptas y le das tu número personal para fidelizarlo por fuera de la plataforma.',
      },
      {
        id: 'b',
        label:
          'Declinas con cordialidad explicando que toda atención debe gestionarse a través de Remote Support 365 para mantener su garantía, trazabilidad y protección bajo NDA.',
      },
      {
        id: 'c',
        label:
          'Le cobras un monto menor por transferencia directa solo si es un ajuste rápido.',
      },
      {
        id: 'd',
        label:
          'Le pasas un correo alternativo personal para futuras consultas privadas.',
      },
    ],
    correctOptionId: 'b',
  },
  {
    id: 'att-4',
    dimension: 'attitude',
    topic: 'Empatía y Trato al Cliente',
    prompt:
      'Un cliente adulto mayor se muestra frustrado y nervioso porque teme perder sus fotos familiares y no entiende términos técnicos. ¿Cómo conduces la atención?',
    options: [
      {
        id: 'a',
        label:
          'Usas jerga técnica avanzada para demostrar autoridad y avanzar más rápido.',
      },
      {
        id: 'b',
        label:
          'Ejecutas cambios en silencio sin avisarle para evitar que haga preguntas.',
      },
      {
        id: 'c',
        label:
          'Lo escuchas con calma, validas su preocupación, le aseguras que sus archivos personales se respetarán y explicas cada acción en lenguaje sencillo antes de ejecutarla.',
      },
      {
        id: 'd',
        label:
          'Le pides que busque a un familiar con conocimientos técnicos antes de continuar.',
      },
    ],
    correctOptionId: 'c',
  },
  {
    id: 'att-5',
    dimension: 'attitude',
    topic: 'Transparencia y Garantía',
    prompt:
      'Durante el diagnóstico confirmas con pruebas SMART y ruidos físicos que el disco duro del cliente tiene un daño físico irreversible que no puede repararse remotamente. ¿Qué haces?',
    options: [
      {
        id: 'a',
        label:
          'Ejecutas herramientas cosméticas para cerrar el ticket como "resuelto" y cobrar la incidencia.',
      },
      {
        id: 'b',
        label:
          'Informas con honestidad el diagnóstico técnico, recomiendas no forzar el disco para proteger sus datos, documentas el hallazgo en el ticket y orientas sobre nuestra garantía y política de reembolso.',
      },
      {
        id: 'c',
        label:
          'Desconectas la sesión sin dejar resumen técnico ni explicación.',
      },
      {
        id: 'd',
        label:
          'Le prometes que el problema se solucionará reiniciando el equipo al día siguiente.',
      },
    ],
    correctOptionId: 'b',
  },
];

export function evaluateTechnicianAssessment(
  answers: Record<string, string>
): TechnicianAssessmentResult {
  const technicalQuestions = TECHNICIAN_ASSESSMENT_QUESTIONS.filter(
    (q) => q.dimension === 'technical'
  );
  const attitudeQuestions = TECHNICIAN_ASSESSMENT_QUESTIONS.filter(
    (q) => q.dimension === 'attitude'
  );

  let correctTechnical = 0;
  for (const question of technicalQuestions) {
    if (answers[question.id] === question.correctOptionId) {
      correctTechnical += 1;
    }
  }

  let correctAttitude = 0;
  for (const question of attitudeQuestions) {
    if (answers[question.id] === question.correctOptionId) {
      correctAttitude += 1;
    }
  }

  const totalTechnical = technicalQuestions.length;
  const totalAttitude = attitudeQuestions.length;
  const totalQuestions = TECHNICIAN_ASSESSMENT_QUESTIONS.length;

  const answeredCount = TECHNICIAN_ASSESSMENT_QUESTIONS.filter(
    (q) => typeof answers[q.id] === 'string' && answers[q.id].trim().length > 0
  ).length;

  const technicalScore =
    totalTechnical > 0 ? Math.round((correctTechnical / totalTechnical) * 100) : 0;
  const attitudeScore =
    totalAttitude > 0 ? Math.round((correctAttitude / totalAttitude) * 100) : 0;
  const totalScore =
    totalQuestions > 0
      ? Math.round(((correctTechnical + correctAttitude) / totalQuestions) * 100)
      : 0;

  let recommendation: AssessmentRecommendation;
  if (totalScore >= 75 && attitudeScore >= 80) {
    recommendation = 'recommended_approve';
  } else if (totalScore >= 60) {
    recommendation = 'manual_review';
  } else {
    recommendation = 'recommended_reject';
  }

  return {
    technicalScore,
    attitudeScore,
    totalScore,
    correctTechnical,
    totalTechnical,
    correctAttitude,
    totalAttitude,
    unansweredCount: Math.max(0, totalQuestions - answeredCount),
    recommendation,
  };
}
