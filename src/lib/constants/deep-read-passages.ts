// Deep Read (RF-04): comprensión lectora. Contenido original y neutro
// (sin terminología clínica), sobre hábitos de estudio. Cada párrafo trae
// 2 preguntas literales (dato dicho explícitamente) + 1 de inferencia
// (hay que combinar varias oraciones del texto para resolverla) — permite
// analizar no solo cuánto entendió, sino qué TIPO de comprensión falla.
//
// Los distractores están escritos para ser creíbles dentro del tema del
// párrafo (mismo dominio, misma dirección que la opción correcta) — a
// propósito, para que la pregunta no se pueda adivinar por sentido común
// sin haber leído el texto: hace falta el dato específico que dice el
// párrafo para descartarlos. Las de inferencia combinan dos elementos del
// texto (p. ej. "bloques cortos" + "pocas interrupciones") de forma que
// solo una opción los tenga ambos correctos.
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
          "Disminuye, pero solo si hay ruido de fondo",
          "Se mantiene estable durante los primeros 45 minutos",
          "Tiende a disminuir",
          "Baja al principio y luego se recupera sola",
        ],
        correctIndex: 2,
        type: "literal",
      },
      {
        question:
          "¿Qué estrategia menciona el texto para mantener la concentración más estable?",
        options: [
          "Extender los bloques de trabajo sin interrupciones",
          "Dividir el trabajo en bloques con pausas breves",
          "Reducir las pausas a medida que avanza la sesión",
          "Tomar una única pausa larga al final de la sesión",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "Según lo que explica el texto, ¿qué tendría más sentido hacer para minimizar la disminución de atención en una sesión larga?",
        options: [
          "Dividir la sesión en bloques cortos, pero en un espacio con muchos estímulos visibles",
          "Trabajar en bloques largos, en un espacio con pocas interrupciones",
          "Dividir la sesión en bloques cortos, en un espacio con pocas interrupciones",
          "Trabajar sin pausas, pero eliminando las notificaciones del teléfono",
        ],
        correctIndex: 2,
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
          "Alternar entre dos tareas relacionadas",
          "Comprometerse a una sola tarea",
          "Revisar el progreso cada pocos minutos",
          "Posponer la tarea principal hasta el descanso",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question: "Según el texto, ¿qué pasa cada cierto número de bloques?",
        options: [
          "Se toma un descanso más largo",
          "Se acorta la duración de los bloques siguientes",
          "Se elimina el descanso de ese ciclo",
          "Se repite el mismo bloque de trabajo",
        ],
        correctIndex: 0,
        type: "literal",
      },
      {
        question:
          "Si alguien cambia de tarea cada pocos minutos durante sus bloques de estudio, según los principios del texto, ¿qué es más probable que ocurra?",
        options: [
          "Va a sostener mejor su energía mental, porque varía el estímulo",
          "Está aplicando la técnica tal como se describe, solo que más rápido",
          "Está rompiendo el principio central de comprometerse a una sola tarea por bloque",
          "El descanso largo se vuelve más necesario, pero el resto no cambia",
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
          "Reducir el número de metas necesarias en total",
          "Mantener el esfuerzo a lo largo del tiempo",
          "Aumentar la dificultad percibida de la tarea",
          "Acelerar el tiempo real que toma cada tarea",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question: "¿Qué reduce tener metas específicas, según el texto?",
        options: [
          "El número de señales de avance que se reciben",
          "La sensación de no saber por dónde empezar",
          "La cantidad de tiempo dedicado a planificar",
          "El interés inicial por la tarea",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "Alguien se propone como única meta “terminar la tesis”, sin dividirla en pasos más chicos. Según el texto, ¿qué es más probable que le pase?",
        options: [
          "Va a sentir más claridad sobre por dónde empezar, aunque tarde más",
          "Es más probable que posponga el inicio de la tarea",
          "Su motivación se va a mantener igual de estable que dividiéndola en pasos",
          "Va a necesitar las mismas señales de avance que si la dividiera",
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
          "El cerebro procesa ambas tareas en paralelo, sin costo adicional",
          "El cerebro cambia rápidamente de una tarea a otra",
          "El cerebro prioriza automáticamente la tarea más simple",
          "El cerebro reduce su actividad general para ahorrar energía",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "¿Qué efecto tiene, según el texto, terminar una tarea antes de empezar otra?",
        options: [
          "Suele resultar en menos tiempo total invertido",
          "Aumenta el tiempo total, porque retomar cuesta más que cambiar",
          "No cambia el tiempo total, solo el orden de las tareas",
          "Depende únicamente de qué tan familiar sea cada tarea",
        ],
        correctIndex: 0,
        type: "literal",
      },
      {
        question:
          "Según el texto, si una persona estudia mientras responde mensajes constantemente, ¿qué es lo más probable que ocurra con el tiempo total que le toma terminar?",
        options: [
          "Va a terminar más rápido, porque alterna entre estímulos distintos",
          "El tiempo no cambia, porque el costo de cambio es insignificante",
          "Va a tardar más, por el costo acumulado de cada cambio de tarea",
          "El costo de cambiar de tarea solo aplica a materias distintas, no a mensajes",
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
          "El tiempo mínimo necesario para adaptarse al espacio",
          "La temperatura ideal para concentrarse",
          "La necesidad de tomar descansos frecuentes",
        ],
        correctIndex: 0,
        type: "literal",
      },
      {
        question:
          "¿Qué efecto tiene tener el teléfono a la vista, aunque esté apagado, según el texto?",
        options: [
          "Ninguno, si está apagado no genera notificaciones",
          "Tiende a fragmentar la concentración",
          "Mejora la capacidad de ignorar otros estímulos",
          "Solo afecta si además está encendido y visible",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "Según el texto, ¿por qué tener el teléfono a la vista afecta la concentración incluso si está apagado?",
        options: [
          "Porque el teléfono, aunque apagado, sigue generando notificaciones",
          "Porque una parte de la atención queda disponible para notarlo, aunque no suene",
          "Porque el brillo de la pantalla distrae incluso apagada",
          "Porque el espacio consistente de estudio deja de funcionar con el teléfono presente",
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
          "La almacena sin ningún cambio hasta el día siguiente",
          "La reorganiza y refuerza",
          "La reduce a los datos más generales, descartando el resto",
          "La convierte automáticamente en un hábito",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "¿Qué puede pasar si se duerme poco después de estudiar, según el texto?",
        options: [
          "Se retiene la misma cantidad, solo que con más esfuerzo",
          "Puede reducir cuánto se retiene",
          "Aumenta la retención a corto plazo, aunque no a largo plazo",
          "Solo afecta la retención si se estudió de noche",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "Según el texto, ¿qué le convendría más a alguien que estudió toda la tarde para un examen al día siguiente?",
        options: [
          "Repasar toda la noche en vez de dormir, para reforzar lo aprendido",
          "Dormir lo suficiente esa noche, para favorecer la consolidación de lo estudiado",
          "Dormir la misma cantidad de horas que cualquier otra noche, sin relación con el examen",
          "Estudiar la misma cantidad de horas, sin dormir, porque el efecto es igual",
        ],
        correctIndex: 1,
        type: "inference",
      },
    ],
  },
  {
    title: "Repetición espaciada",
    text: "Repasar la misma información varias veces en una sola sesión no es tan efectivo como distribuir esos repasos a lo largo de varios días. Esta técnica, conocida como repetición espaciada, aprovecha que la memoria se fortalece más cuando el cerebro tiene que hacer un pequeño esfuerzo para recordar algo que empezó a olvidar, en vez de repasarlo mientras todavía está fresco. Por eso, repasar un tema el mismo día, luego a los tres días, y luego a la semana, suele generar un recuerdo más duradero que repasarlo cinco veces seguidas en una sola tarde.",
    questions: [
      {
        question: "Según el texto, ¿qué aprovecha la repetición espaciada?",
        options: [
          "Que repasar más veces seguidas siempre genera mejor memoria",
          "Que la memoria se fortalece cuando el cerebro hace un esfuerzo por recordar algo que empezaba a olvidar",
          "Que el cerebro recuerda mejor la información más reciente",
          "Que repasar información fresca refuerza más el recuerdo",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "Según el ejemplo del texto, ¿qué distribución de repasos se menciona?",
        options: [
          "El mismo día, a los tres días, y a la semana",
          "Cada día durante una semana completa",
          "Una vez por semana durante un mes",
          "El mismo día y luego recién al mes siguiente",
        ],
        correctIndex: 0,
        type: "literal",
      },
      {
        question:
          "Según el texto, ¿qué le convendría más a alguien que quiere recordar un tema por mucho tiempo?",
        options: [
          "Repasar el tema cinco veces seguidas la noche anterior al examen",
          "Distribuir los repasos en varios días, en vez de repasar todo junto una sola tarde",
          "Repasar solo una vez, apenas aprendido el tema, sin repetir después",
          "Esperar a haber olvidado todo el tema antes de repasarlo por primera vez",
        ],
        correctIndex: 1,
        type: "inference",
      },
    ],
  },
  {
    title: "Ejercicio físico y concentración",
    text: "La actividad física moderada, como caminar rápido durante 20 minutos, se asocia con una mejora temporal en la capacidad de concentrarse en tareas que exigen atención. El efecto no es inmediato en el mismo segundo en que se termina de hacer ejercicio, sino que se mantiene durante un periodo de una a dos horas después. Por eso, hacer una caminata antes de una sesión de estudio importante puede ayudar más que hacerla varias horas antes, cuando ese efecto ya se disipó.",
    questions: [
      {
        question:
          "Según el texto, ¿con qué se asocia la actividad física moderada?",
        options: [
          "Una mejora temporal en la capacidad de concentrarse",
          "Una reducción permanente de la necesidad de dormir",
          "Un aumento inmediato de energía que dura todo el día",
          "Una mejora en la memoria a largo plazo, no en la concentración",
        ],
        correctIndex: 0,
        type: "literal",
      },
      {
        question: "¿Cuánto dura el efecto sobre la concentración, según el texto?",
        options: [
          "Solo el mismo segundo en que termina el ejercicio",
          "Una a dos horas después del ejercicio",
          "Todo el día, sin importar cuándo se hizo",
          "Únicamente mientras dura el ejercicio",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "Según el texto, ¿cuándo convendría más hacer una caminata si hay una sesión de estudio importante en la tarde?",
        options: [
          "A primera hora de la mañana, sin importar cuándo sea la sesión",
          "Poco antes de la sesión de estudio, no varias horas antes",
          "Da igual el momento, el efecto dura todo el día",
          "Inmediatamente después de la sesión de estudio, no antes",
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
