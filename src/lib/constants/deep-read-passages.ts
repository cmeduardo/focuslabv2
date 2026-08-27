// Deep Read (RF-04): comprensión lectora bajo tiempo limitado. Contenido
// original y neutro (sin terminología clínica), sobre hábitos de estudio.
export type DeepReadQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
};

export type DeepReadPassage = {
  title: string;
  text: string;
  questions: DeepReadQuestion[];
};

export const DEEP_READ_PASSAGES: DeepReadPassage[] = [
  {
    title: "Atención sostenida",
    text: "La atención sostenida es la capacidad de mantener el enfoque en una tarea durante un periodo prolongado sin distraerse. No es un recurso ilimitado: tiende a disminuir después de 20 a 30 minutos de trabajo continuo, sobre todo si el entorno tiene estímulos que compiten por la atención, como notificaciones del teléfono o conversaciones cercanas. Estudiar en un espacio con pocas interrupciones, y dividir el trabajo en bloques con pausas breves, ayuda a mantener un nivel de concentración más estable a lo largo de una sesión de estudio.",
    questions: [
      {
        question:
          "Según el texto, ¿qué ocurre con la atención sostenida después de 20 a 30 minutos de trabajo continuo?",
        options: [
          "Aumenta progresivamente",
          "Se mantiene igual todo el día",
          "Tiende a disminuir",
          "Desaparece por completo",
        ],
        correctIndex: 2,
      },
      {
        question:
          "¿Qué estrategia menciona el texto para mantener la concentración más estable?",
        options: [
          "Trabajar sin pausas hasta terminar",
          "Dividir el trabajo en bloques con pausas breves",
          "Estudiar siempre de noche",
          "Evitar por completo los descansos",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    title: "Bloques de trabajo enfocado",
    text: "Una técnica común para organizar el tiempo de estudio consiste en alternar bloques cortos de trabajo enfocado con descansos breves. Durante el bloque de trabajo, la persona se compromete a una sola tarea y evita cambiar de actividad; al terminar, toma un descanso de pocos minutos antes de continuar. Repetir este ciclo varias veces, con un descanso más largo cada cierto número de bloques, puede ayudar a sostener la energía mental durante sesiones de estudio largas, en lugar de mantener el esfuerzo constante sin pausas hasta llegar al cansancio.",
    questions: [
      {
        question: "Durante el bloque de trabajo enfocado, ¿qué se recomienda hacer?",
        options: [
          "Cambiar de tarea cada pocos minutos",
          "Comprometerse a una sola tarea",
          "Tomar el descanso largo primero",
          "Trabajar sin ningún objetivo definido",
        ],
        correctIndex: 1,
      },
      {
        question: "Según el texto, ¿qué pasa cada cierto número de bloques?",
        options: [
          "Se repite el mismo descanso corto",
          "Se toma un descanso más largo",
          "Se termina la sesión de estudio",
          "Se elimina el descanso",
        ],
        correctIndex: 1,
      },
    ],
  },
];
