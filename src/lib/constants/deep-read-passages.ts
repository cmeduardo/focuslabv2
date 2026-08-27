// Deep Read (RF-04): comprensión lectora. Contenido original y neutro
// (sin terminología clínica), sobre hábitos de estudio. Cada párrafo trae
// 2 preguntas literales (dato dicho explícitamente) + 1 de inferencia
// (hay que combinar varias oraciones del texto para resolverla) — permite
// analizar no solo cuánto entendió, sino qué TIPO de comprensión falla.
export type DeepReadQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  type: "literal" | "inference";
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
        type: "literal",
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
        type: "literal",
      },
      {
        question:
          "Según lo que explica el texto, ¿qué tendría más sentido hacer para minimizar la disminución de atención en una sesión larga?",
        options: [
          "Estudiar 3 horas seguidas sin pausas, en un lugar con muchas distracciones",
          "Dividir la sesión en bloques cortos, en un espacio con pocas interrupciones",
          "Estudiar solo de noche sin importar el entorno",
          "Aumentar la cantidad de estímulos visibles alrededor",
        ],
        correctIndex: 1,
        type: "inference",
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
        type: "literal",
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
        type: "literal",
      },
      {
        question:
          "Si alguien cambia de tarea cada pocos minutos durante sus bloques de estudio, según los principios del texto, ¿qué es más probable que ocurra?",
        options: [
          "Va a sostener mejor su energía mental",
          "Está aplicando la técnica tal como se describe",
          "Está rompiendo el principio central de comprometerse a una sola tarea por bloque",
          "El descanso largo se vuelve innecesario",
        ],
        correctIndex: 2,
        type: "inference",
      },
    ],
  },
  {
    title: "Metas pequeñas",
    text: "Dividir una tarea grande en metas pequeñas y concretas facilita mantener el esfuerzo a lo largo del tiempo. En vez de proponerse “estudiar todo el capítulo”, es más manejable fijar objetivos como “leer las primeras diez páginas” o “resolver cinco ejercicios”. Cada meta cumplida ofrece una señal clara de avance, lo que ayuda a sostener la motivación durante sesiones largas. Además, tener metas específicas reduce la sensación de no saber por dónde empezar, un factor que suele hacer que las personas pospongan el inicio de una tarea.",
    questions: [
      {
        question:
          "Según el texto, ¿qué facilita dividir una tarea grande en metas pequeñas?",
        options: [
          "Terminar la tarea sin ningún esfuerzo",
          "Mantener el esfuerzo a lo largo del tiempo",
          "Evitar por completo hacer la tarea",
          "Aumentar la sensación de no saber por dónde empezar",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question: "¿Qué reduce tener metas específicas, según el texto?",
        options: [
          "La motivación general",
          "El número de páginas por leer",
          "La sensación de no saber por dónde empezar",
          "El tiempo total de estudio",
        ],
        correctIndex: 2,
        type: "literal",
      },
      {
        question:
          "Alguien se propone como única meta “terminar la tesis”, sin dividirla en pasos más chicos. Según el texto, ¿qué es más probable que le pase?",
        options: [
          "Va a sentir más claridad sobre por dónde empezar",
          "Es más probable que posponga el inicio de la tarea",
          "Su motivación se va a mantener igual de estable que dividiéndola",
          "Va a necesitar menos señales de avance",
        ],
        correctIndex: 1,
        type: "inference",
      },
    ],
  },
  {
    title: "Multitarea aparente",
    text: "Cambiar constantemente entre distintas tareas —revisar el teléfono mientras se lee, o alternar entre dos materias en la misma sesión— no es multitarea real: el cerebro no procesa dos actividades complejas al mismo tiempo, sino que cambia rápidamente de una a otra. Cada cambio tiene un costo: retomar el hilo de lo que se estaba haciendo toma algunos segundos, y esos segundos se acumulan a lo largo de una sesión de estudio. Terminar una tarea antes de empezar otra, aunque parezca más lento al principio, suele resultar en menos tiempo total invertido.",
    questions: [
      {
        question:
          "Según el texto, ¿qué ocurre realmente cuando alguien “hace multitarea”?",
        options: [
          "El cerebro procesa dos tareas complejas a la vez sin costo",
          "El cerebro cambia rápidamente de una tarea a otra",
          "El cerebro apaga por completo una de las tareas",
          "No hay ningún cambio en el procesamiento",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "¿Qué efecto tiene, según el texto, terminar una tarea antes de empezar otra?",
        options: [
          "Aumenta el tiempo total invertido",
          "No tiene ningún efecto",
          "Suele resultar en menos tiempo total invertido",
          "Hace que el cambio de tarea sea instantáneo",
        ],
        correctIndex: 2,
        type: "literal",
      },
      {
        question:
          "Según el texto, si una persona estudia mientras responde mensajes constantemente, ¿qué es lo más probable que ocurra con el tiempo total que le toma terminar?",
        options: [
          "Va a terminar más rápido que si hiciera una cosa a la vez",
          "El tiempo no cambia porque el cerebro procesa ambas tareas en paralelo",
          "Va a tardar más, por el costo acumulado de cada cambio de tarea",
          "El costo de cambiar de tarea desaparece con la práctica",
        ],
        correctIndex: 2,
        type: "inference",
      },
    ],
  },
  {
    title: "El entorno de estudio",
    text: "El lugar donde se estudia influye en la facilidad para mantener la atención. Un espacio con buena iluminación, temperatura estable y pocos objetos visibles fuera de lo necesario reduce la cantidad de estímulos que compiten por la atención. Por el contrario, estudiar en un lugar con ruido variable o con el teléfono a la vista —incluso apagado— tiende a fragmentar la concentración, porque una parte de la atención queda disponible para notar esos estímulos. Elegir un espacio consistente para estudiar, usado solo con ese fin, también ayuda a que el cerebro asocie ese lugar con el modo de concentración.",
    questions: [
      {
        question:
          "Según el texto, ¿qué reduce un espacio con buena iluminación y pocos objetos visibles?",
        options: [
          "La cantidad de estímulos que compiten por la atención",
          "El tiempo disponible para estudiar",
          "La temperatura del ambiente",
          "La necesidad de tomar descansos",
        ],
        correctIndex: 0,
        type: "literal",
      },
      {
        question:
          "¿Qué efecto tiene tener el teléfono a la vista, aunque esté apagado, según el texto?",
        options: [
          "Ninguno, si está apagado no afecta",
          "Tiende a fragmentar la concentración",
          "Mejora la iluminación del espacio",
          "Elimina el ruido variable",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "Según el texto, ¿por qué tener el teléfono a la vista afecta la concentración incluso si está apagado?",
        options: [
          "Porque el teléfono cambia la temperatura del ambiente",
          "Porque una parte de la atención queda disponible para notarlo, aunque no suene",
          "Porque el teléfono ilumina el espacio de estudio",
          "Porque reemplaza al espacio consistente de estudio",
        ],
        correctIndex: 1,
        type: "inference",
      },
    ],
  },
  {
    title: "Descanso y consolidación",
    text: "Durante el sueño, el cerebro reorganiza y refuerza información aprendida durante el día, un proceso conocido como consolidación. Por eso, repasar un tema justo antes de dormir puede ser más efectivo que repasarlo en otro momento, y dormir poco después de estudiar puede reducir cuánto se retiene, incluso si el tiempo de estudio fue el mismo. Esto no significa que dormir reemplace el estudio, sino que ambos funcionan juntos: sin suficiente descanso, buena parte del esfuerzo invertido en aprender algo nuevo se aprovecha menos de lo que podría.",
    questions: [
      {
        question:
          "Según el texto, ¿qué hace el cerebro durante el sueño con la información aprendida?",
        options: [
          "La elimina por completo",
          "La reorganiza y refuerza",
          "La ignora hasta el día siguiente",
          "La convierte en un recuerdo distinto",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "¿Qué puede pasar si se duerme poco después de estudiar, según el texto?",
        options: [
          "Se retiene exactamente lo mismo que con buen descanso",
          "Se retiene más información de la normal",
          "Puede reducir cuánto se retiene",
          "El estudio se vuelve innecesario",
        ],
        correctIndex: 2,
        type: "literal",
      },
      {
        question:
          "Según el texto, ¿qué le convendría más a alguien que estudió toda la tarde para un examen al día siguiente?",
        options: [
          "Quedarse despierto toda la noche repasando en vez de dormir",
          "Dormir lo suficiente esa noche, para favorecer la consolidación de lo estudiado",
          "Dormir no tiene relación con lo que estudió esa tarde",
          "Estudiar exactamente la misma cantidad de horas sin dormir rinde igual",
        ],
        correctIndex: 1,
        type: "inference",
      },
    ],
  },
];

// Cada partida elige `count` párrafos al azar (sin repetir), en orden
// aleatorio — así una repetición no muestra siempre el mismo trío.
export function pickRandomPassages(count: number): DeepReadPassage[] {
  const shuffled = [...DEEP_READ_PASSAGES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
