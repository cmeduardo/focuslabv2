// Deep Read (RF-04): comprensión lectora. Contenido original y neutro
// (sin terminología clínica), sobre ciencia del aprendizaje y la memoria.
// Cada párrafo trae 2 preguntas literales (dato dicho explícitamente) + 1
// de inferencia (hay que combinar varias oraciones del texto para
// resolverla) — permite analizar no solo cuánto entendió, sino qué TIPO
// de comprensión falla.
//
// Reescritos 2026-08-28 (segunda vuelta): la primera versión, sobre
// hábitos de estudio genéricos ("dividir el trabajo en bloques ayuda"),
// seguía siendo adivinable sin leer incluso con distractores plausibles
// — son afirmaciones que cualquier adulto razonable ya intuye como
// ciertas. Esta versión cambia a fenómenos concretos y técnicos de la
// ciencia cognitiva (efecto de posición serial, interferencia,
// consolidación durante el sueño, etc.) con mecanismos y condiciones
// específicas que solo se pueden saber leyendo el párrafo exacto — el
// sentido común no alcanza para adivinar, por ejemplo, si la interferencia
// retroactiva depende del parecido entre la información nueva y la vieja.
// Los distractores siguen el mismo criterio que la primera versión:
// creíbles dentro del tema, misma dirección que la opción correcta, y las
// de inferencia combinan dos condiciones del texto para que solo una
// opción las tenga ambas bien.
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
    title: "Efecto de posición serial",
    text: "Cuando alguien intenta recordar una lista de elementos, la probabilidad de recordar cada uno no es uniforme: los primeros elementos de la lista y los últimos se recuerdan mejor que los del medio, un patrón conocido como efecto de posición serial. La ventaja de los primeros elementos (efecto de primacía) ocurre porque tuvieron más tiempo de repasarse antes de que llegaran los siguientes. La ventaja de los últimos elementos (efecto de recencia) ocurre porque todavía están en la memoria a corto plazo al momento de recordar. Si se agrega una tarea que ocupe la atención justo después de terminar la lista, el efecto de recencia desaparece, pero el de primacía se mantiene casi igual.",
    questions: [
      {
        question:
          "Según el texto, ¿por qué se recuerdan mejor los primeros elementos de una lista?",
        options: [
          "Porque el cerebro los marca automáticamente como más importantes",
          "Porque tuvieron más tiempo de repasarse antes de que llegaran los siguientes",
          "Porque quedan guardados directamente en la memoria a largo plazo sin repaso",
          "Porque son los que menos interferencia reciben de elementos posteriores",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "¿Qué pasa con el efecto de recencia si se agrega una tarea que ocupe la atención justo después de la lista, según el texto?",
        options: [
          "Se hace más fuerte",
          "Desaparece",
          "Se mantiene igual que el de primacía",
          "Solo desaparece si la tarea dura más de un minuto",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "Si alguien memoriza una lista y justo después resuelve un problema de matemática antes de recitarla, según el texto, ¿qué parte de la lista es más probable que recuerde peor?",
        options: [
          "Los primeros elementos, porque el efecto de primacía es el que se pierde con cualquier interrupción",
          "Los últimos elementos, porque el efecto de recencia se pierde con la tarea intermedia",
          "Los del medio, porque nunca tuvieron ningún tipo de ventaja para empezar",
          "Ninguna, porque el efecto de primacía compensa la pérdida del de recencia",
        ],
        correctIndex: 1,
        type: "inference",
      },
    ],
  },
  {
    title: "La curva del olvido",
    text: "El psicólogo Hermann Ebbinghaus estudió cuánto se olvida información nueva con el paso del tiempo si no se repasa. Encontró que el olvido no es parejo: la mayor parte de la pérdida ocurre en las primeras horas después de aprender algo, y después la curva se aplana — lo que sobrevive al primer día tiende a mantenerse más estable durante las semanas siguientes. Repasar la información antes de que se complete esa caída inicial —por ejemplo, unas horas después de la primera exposición— recupera gran parte de lo que se estaba por perder, y cada repaso posterior hace que la curva se aplane más rápido la próxima vez.",
    questions: [
      {
        question:
          "Según el texto, ¿cuándo ocurre la mayor parte del olvido de información nueva?",
        options: [
          "De forma pareja a lo largo de varias semanas",
          "En las primeras horas después de aprenderla",
          "Recién después del primer día",
          "Solo si la información nunca se repasa en absoluto",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "¿Qué efecto tiene cada repaso posterior sobre la curva de olvido, según el texto?",
        options: [
          "Hace que la curva se aplane más rápido la próxima vez",
          "Elimina por completo la posibilidad de volver a olvidar",
          "Alarga el tiempo que dura la caída inicial",
          "No tiene ningún efecto adicional después del primer repaso",
        ],
        correctIndex: 0,
        type: "literal",
      },
      {
        question:
          "Según el texto, ¿en qué momento sería más efectivo repasar algo recién aprendido para recuperar la mayor parte de lo que se estaba por perder?",
        options: [
          "Exactamente un mes después, cuando la curva ya está aplanada",
          "Unas horas después de la primera exposición, antes de que se complete la caída inicial",
          "Da igual el momento, mientras se repase alguna vez",
          "Solo tiene sentido repasar antes de aprender el contenido por primera vez",
        ],
        correctIndex: 1,
        type: "inference",
      },
    ],
  },
  {
    title: "Interferencia proactiva y retroactiva",
    text: "Cuando algo aprendido antes dificulta recordar algo aprendido después, se llama interferencia proactiva — por ejemplo, cuesta más aprender un segundo idioma con reglas gramaticales opuestas al primero. Cuando ocurre al revés, y lo aprendido después dificulta recordar lo aprendido antes, se llama interferencia retroactiva — por ejemplo, cambiar de contraseña varias veces hace que sea más difícil recordar la primera. Cuanto más parecida es la información nueva a la anterior, mayor es la interferencia en ambas direcciones; información muy distinta entre sí casi no interfiere.",
    questions: [
      {
        question:
          "Según el texto, ¿cómo se llama cuando algo aprendido ANTES dificulta recordar algo aprendido DESPUÉS?",
        options: [
          "Interferencia retroactiva",
          "Interferencia proactiva",
          "Efecto de recencia",
          "Efecto de primacía",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "Según el texto, ¿qué determina qué tan fuerte es la interferencia entre dos informaciones?",
        options: [
          "El orden en que se aprendieron, sin importar el contenido",
          "Qué tan parecidas son entre sí",
          "Cuánto tiempo pasó entre una y otra",
          "Si se aprendieron en el mismo lugar físico",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "Alguien cambia su contraseña por una completamente distinta a la anterior (letras, números y orden diferentes). Según el texto, ¿qué tan probable es que esto le genere interferencia retroactiva fuerte con la contraseña vieja?",
        options: [
          "Muy probable, porque cualquier contraseña nueva genera la misma interferencia",
          "Poco probable, porque la interferencia es mayor cuanto más parecida es la información nueva a la anterior",
          "Muy probable, pero solo por tratarse de interferencia proactiva",
          "Imposible saberlo, el texto no relaciona la interferencia con el parecido entre informaciones",
        ],
        correctIndex: 1,
        type: "inference",
      },
    ],
  },
  {
    title: "El efecto de generación",
    text: "Cuando una persona genera una respuesta por su cuenta —completar una palabra a la que le falta una letra, o responder una pregunta antes de ver la respuesta— la retiene mejor que si simplemente la lee ya completa. Este efecto de generación funciona incluso cuando la respuesta generada es incorrecta al principio, siempre que después se corrija con la respuesta correcta: el esfuerzo de intentar responder deja una huella de memoria más fuerte que la lectura pasiva, aunque el primer intento haya fallado.",
    questions: [
      {
        question:
          "Según el texto, ¿qué retiene mejor una persona: una respuesta que generó por su cuenta, o una que solo leyó ya completa?",
        options: [
          "La que solo leyó ya completa",
          "La que generó por su cuenta",
          "Retiene igual las dos, sin diferencia",
          "Depende únicamente de cuántas veces la haya leído",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "¿Qué condición pone el texto para que el efecto de generación funcione incluso con una respuesta incorrecta al principio?",
        options: [
          "Que la persona no se dé cuenta de que se equivocó",
          "Que después se corrija con la respuesta correcta",
          "Que el error se repita varias veces antes de corregirlo",
          "Que la respuesta incorrecta sea parecida a la correcta",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "Según el texto, ¿qué le convendría más a alguien estudiando definiciones para un examen: leer cada definición completa varias veces, o taparla e intentar decirla de memoria antes de revisarla?",
        options: [
          "Leer cada definición completa varias veces, porque genera menos errores en el camino",
          "Taparla e intentar decirla de memoria antes de revisarla, aunque se equivoque al principio",
          "Da exactamente lo mismo, según el texto ambos métodos generan la misma huella de memoria",
          "Ninguna de las dos: el texto dice que ambos métodos son igual de débiles sin repetición espaciada",
        ],
        correctIndex: 1,
        type: "inference",
      },
    ],
  },
  {
    title: "Sueño y consolidación de memoria",
    text: "Durante una noche de sueño típica, el cuerpo alterna entre sueño de ondas lentas (más profundo, concentrado en la primera mitad de la noche) y sueño REM (asociado a los sueños vívidos, que se vuelve más largo y frecuente hacia la segunda mitad). La consolidación de memorias de datos y hechos concretos parece depender más del sueño de ondas lentas, mientras que la consolidación de habilidades motoras y memoria emocional parece depender más del sueño REM. Por eso, acortar la noche de sueño desde el final —por ejemplo, despertarse varias horas antes de lo habitual— afecta más al REM que al sueño de ondas lentas, ya que este último ya ocurrió en su mayoría al principio de la noche.",
    questions: [
      {
        question:
          "Según el texto, ¿en qué parte de la noche se concentra el sueño de ondas lentas?",
        options: [
          "En la segunda mitad de la noche",
          "En la primera mitad de la noche",
          "Distribuido parejo durante toda la noche",
          "Solo en los últimos 20 minutos antes de despertar",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "Según el texto, ¿qué tipo de consolidación depende más del sueño REM?",
        options: [
          "Datos y hechos concretos",
          "Habilidades motoras y memoria emocional",
          "Vocabulario de un idioma nuevo",
          "Ambos tipos por igual, sin ninguna diferencia",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "Según el texto, ¿qué tipo de consolidación se ve más afectada si alguien se despierta varias horas antes de lo habitual?",
        options: [
          "La que depende del sueño de ondas lentas, porque es la fase más frágil",
          "La que depende del sueño REM, porque esa fase ocurre más hacia el final de la noche",
          "Ninguna: el texto dice que despertarse antes no afecta ningún tipo de consolidación",
          "Ambas por igual, ya que las dos fases se acortan en la misma proporción",
        ],
        correctIndex: 1,
        type: "inference",
      },
    ],
  },
  {
    title: "Notas a mano vs. en computadora",
    text: "Tomar notas a mano suele obligar a resumir y reformular lo que se escucha con palabras propias, porque escribir a mano es más lento que escuchar. Tomar notas en computadora permite escribir casi palabra por palabra lo que dice quien habla, ya que teclear es más rápido. Aunque esto último genera notas más completas, varios estudios encontraron que las notas a mano se asocian con mejor comprensión posterior del contenido —no por el medio en sí, sino porque el proceso de resumir mientras se escribe obliga a procesar la información en vez de solo transcribirla.",
    questions: [
      {
        question:
          "Según el texto, ¿por qué tomar notas a mano suele obligar a resumir?",
        options: [
          "Porque las manos se cansan antes que al escribir en computadora",
          "Porque escribir a mano es más lento que escuchar",
          "Porque el papel tiene menos espacio disponible que una pantalla",
          "Porque es una regla que se enseña explícitamente al tomar notas",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question: "¿Qué generan las notas tomadas en computadora, según el texto?",
        options: [
          "Notas más completas",
          "Notas más cortas que las manuscritas",
          "Mejor comprensión posterior que las notas a mano",
          "El mismo nivel de resumen que las notas a mano",
        ],
        correctIndex: 0,
        type: "literal",
      },
      {
        question:
          "Según el texto, ¿a qué se debe realmente la ventaja de comprensión de las notas a mano: al medio (el papel) en sí, o a otra cosa?",
        options: [
          "Al medio en sí: escribir sobre papel activa una parte del cerebro que el teclado no activa",
          "A que el proceso de resumir mientras se escribe obliga a procesar la información",
          "A que las notas en computadora se pierden con más frecuencia",
          "El texto no da ninguna explicación de por qué ocurre esa ventaja",
        ],
        correctIndex: 1,
        type: "inference",
      },
    ],
  },
  {
    title: "Carga cognitiva y memoria de trabajo",
    text: "La memoria de trabajo —la que mantiene información activa mientras se la usa, como recordar un número de teléfono mientras se lo marca— tiene una capacidad limitada, generalmente entre cuatro y siete elementos a la vez para la mayoría de las personas. Agrupar información en unidades más grandes (por ejemplo, recordar un número de diez dígitos como tres grupos en vez de diez dígitos sueltos) permite manejar más información porque cada grupo cuenta como un solo elemento. Cuando la memoria de trabajo se satura —por ejemplo, al intentar resolver un problema complejo mientras alguien habla al lado— el rendimiento en la tarea principal empeora, incluso si la distracción no requiere ninguna respuesta.",
    questions: [
      {
        question:
          "Según el texto, ¿cuántos elementos puede mantener activos la memoria de trabajo, para la mayoría de las personas?",
        options: [
          "Entre cuatro y siete",
          "Uno o dos como máximo",
          "Más de veinte, sin un límite claro",
          "Depende únicamente de la edad de la persona",
        ],
        correctIndex: 0,
        type: "literal",
      },
      {
        question:
          "Según el texto, ¿qué logra agrupar información en unidades más grandes?",
        options: [
          "Manejar más información, porque cada grupo cuenta como un solo elemento",
          "Aumentar el límite real de la memoria de trabajo de forma permanente",
          "Reducir la cantidad total de información que se puede recordar",
          "Ninguna ventaja: agrupar no cambia nada según el texto",
        ],
        correctIndex: 0,
        type: "literal",
      },
      {
        question:
          "Según el texto, si alguien intenta resolver un problema complejo mientras otra persona habla cerca —aunque no le esté hablando a él directamente—, ¿qué es más probable que pase con su rendimiento en el problema?",
        options: [
          "Se mantenga igual, porque no tiene que responderle a quien habla",
          "Empeore, porque la memoria de trabajo se satura incluso sin necesidad de responder a la distracción",
          "Mejore, porque el ruido de fondo ayuda a mantener la concentración",
          "Depende solo del volumen de la voz, no de la carga del problema",
        ],
        correctIndex: 1,
        type: "inference",
      },
    ],
  },
  {
    title: "Tareas inconclusas (efecto Zeigarnik)",
    text: "Las tareas que quedan sin terminar tienden a recordarse mejor, y a intrusar más en el pensamiento, que las que ya se completaron — un patrón conocido como efecto Zeigarnik. La explicación es que una tarea interrumpida deja una tensión mental activa hasta que se resuelve, mientras que terminar una tarea permite que esa tensión se libere y el cerebro deje de priorizarla. Escribir un plan concreto de cuándo y cómo se va a retomar una tarea pendiente —no necesariamente terminarla— reduce esa intrusión casi tanto como completarla de verdad, porque la tensión baja apenas hay un plan claro, no solo cuando la tarea está resuelta.",
    questions: [
      {
        question:
          "Según el texto, ¿qué tiende a recordarse mejor: las tareas terminadas o las que quedan sin terminar?",
        options: [
          "Las tareas terminadas",
          "Las que quedan sin terminar",
          "Ambas se recuerdan igual, según el texto",
          "Ninguna de las dos: solo se recuerdan las que se planificaron por escrito",
        ],
        correctIndex: 1,
        type: "literal",
      },
      {
        question:
          "Según el texto, ¿qué reduce la intrusión mental de una tarea pendiente casi tanto como completarla de verdad?",
        options: [
          "Escribir un plan concreto de cuándo y cómo retomarla",
          "Olvidarse por completo de la tarea pendiente",
          "Empezar una tarea nueva sin relación con la anterior",
          "Hablar con otra persona sobre la tarea sin planificar nada",
        ],
        correctIndex: 0,
        type: "literal",
      },
      {
        question:
          "Alguien deja a medias un informe importante y, en vez de seguir trabajando esa noche, anota exactamente qué le falta y a qué hora lo va a retomar mañana. Según el texto, ¿qué es lo más probable que le pase con la intrusión mental de esa tarea esa noche?",
        options: [
          "Va a seguir igual de alta hasta que termine el informe por completo",
          "Va a bajar bastante, aunque no haya terminado el informe, porque ya tiene un plan claro para retomarlo",
          "Va a subir, porque anotar la tarea pendiente refuerza el efecto Zeigarnik",
          "El texto no permite predecir nada sobre este caso",
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
