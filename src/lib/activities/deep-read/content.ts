// Deep Read (v2): un único texto de divulgación para todos los
// participantes (comparable entre personas), con las opciones de cada
// pregunta barajadas. El tema es deliberadamente específico y poco
// conocido: la lección de las versiones anteriores fue que con temas de
// sentido común las respuestas se adivinan sin leer, por plausibles que
// sean los distractores. Aquí cada respuesta depende de un dato o un
// mecanismo concreto del texto.

export type DeepReadOption = { id: string; text: string };

export type DeepReadQuestion = {
  id: string;
  type: "literal" | "inference";
  question: string;
  options: DeepReadOption[];
  correctId: string;
};

export type DeepReadPassage = {
  id: string;
  title: string;
  paragraphs: string[];
  questions: DeepReadQuestion[];
};

export const DEEP_READ_PASSAGE: DeepReadPassage = {
  id: "qanats-v1",
  title: "Los qanats: ríos bajo el desierto",
  paragraphs: [
    "En las mesetas áridas de Irán, donde en muchas zonas llueve menos de 250 milímetros al año, hace casi tres mil años se desarrolló una forma ingeniosa de conseguir agua: el qanat. Un qanat es un túnel subterráneo, casi horizontal, que conduce el agua de un acuífero ubicado al pie de las montañas hasta los campos y aldeas de la llanura, sin bombas ni ninguna otra fuente de energía. Todo el sistema funciona por gravedad.",
    "La construcción comenzaba con el pozo madre. Los constructores, llamados muqannis, excavaban primero un pozo en la parte alta del terreno hasta encontrar la capa de agua; en algunos casos ese pozo superaba los cien metros de profundidad. Después, desde el punto de salida en la llanura, abrían el túnel en dirección contraria, cuesta arriba, hasta llegar al pozo madre.",
    "La pendiente del túnel era la decisión más delicada. Si era demasiado pronunciada, el agua corría con tanta fuerza que erosionaba las paredes y provocaba derrumbes; si era casi plana, el agua se estancaba y el túnel se llenaba de sedimentos. Por eso la inclinación habitual era muy suave: entre medio metro y un metro de descenso por cada kilómetro de recorrido.",
    "A lo largo del túnel se abrían pozos verticales cada 20 a 35 metros. Vistos desde el aire, forman largas filas de montículos parecidos a pequeños cráteres. Estos pozos cumplían tres funciones: sacar la tierra excavada, dejar entrar aire a los trabajadores y permitir, años después, bajar a limpiar y reparar el canal.",
    "El qanat de Gonabad, en el noreste de Irán, es uno de los más antiguos que siguen en uso: tiene unos 2700 años, su pozo madre alcanza cerca de 300 metros de profundidad y su recorrido supera los 30 kilómetros. Todavía abastece a unas cuarenta mil personas.",
    "Una ventaja del sistema es que el agua viaja bajo tierra y, por eso, casi no se evapora, algo decisivo en un clima donde el sol del verano secaría cualquier canal abierto. Además, el caudal depende de la recarga natural del acuífero, de modo que un qanat no puede extraer más agua de la que la montaña repone; las bombas modernas, en cambio, pueden agotar un acuífero en pocas décadas.",
    "En 2016, la UNESCO declaró Patrimonio de la Humanidad a once qanats iraníes y los reconoció como un ejemplo de gestión comunitaria del agua: en muchas aldeas, el turno de riego de cada familia se medía con relojes de agua y se repartía según acuerdos que pasaban de generación en generación.",
  ],
  questions: [
    {
      id: "q1-pendiente",
      type: "literal",
      question: "¿Qué ocurría si la pendiente del túnel era demasiado pronunciada?",
      options: [
        { id: "a", text: "El agua erosionaba las paredes y provocaba derrumbes." },
        { id: "b", text: "El agua se estancaba y el túnel se llenaba de sedimentos." },
        { id: "c", text: "El agua se evaporaba antes de llegar a la llanura." },
        { id: "d", text: "Los muqannis no recibían suficiente aire para trabajar." },
      ],
      correctId: "a",
    },
    {
      id: "q2-orden",
      type: "literal",
      question: "Según el texto, ¿qué se construía primero?",
      options: [
        { id: "a", text: "El túnel, desde la salida en la llanura." },
        { id: "b", text: "Un pozo en la parte alta, hasta encontrar el agua." },
        { id: "c", text: "Los pozos verticales de ventilación." },
        { id: "d", text: "Los canales de riego de la aldea." },
      ],
      correctId: "b",
    },
    {
      id: "q3-pozos",
      type: "literal",
      question: "¿Cada cuánto se abrían los pozos verticales a lo largo del túnel?",
      options: [
        { id: "a", text: "Cada 2 o 3 metros." },
        { id: "b", text: "Cada 100 a 150 metros." },
        { id: "c", text: "Cada 20 a 35 metros." },
        { id: "d", text: "Cada medio kilómetro." },
      ],
      correctId: "c",
    },
    {
      id: "q4-sostenible",
      type: "inference",
      question: "¿Por qué un qanat cuida mejor el acuífero que una bomba moderna?",
      options: [
        { id: "a", text: "Porque no necesita limpieza ni reparaciones con el paso de los años." },
        { id: "b", text: "Porque lleva el agua más rápido hasta las aldeas." },
        { id: "c", text: "Porque sus pozos verticales dejan entrar agua de lluvia al túnel." },
        { id: "d", text: "Porque no puede sacar más agua de la que la montaña repone." },
      ],
      correctId: "d",
    },
    {
      id: "q5-gonabad",
      type: "inference",
      question: "¿Qué hace del qanat de Gonabad un caso notable, según el texto?",
      options: [
        { id: "a", text: "Fue el primero que la UNESCO reconoció, en 2016." },
        { id: "b", text: "Lleva unos 2700 años y todavía abastece a miles de personas." },
        { id: "c", text: "Es el único que funciona con bombas además de la gravedad." },
        { id: "d", text: "Su túnel es completamente plano, sin ninguna pendiente." },
      ],
      correctId: "b",
    },
  ],
};

export const DEEP_READ_PRACTICE: DeepReadPassage = {
  id: "faro-practica",
  title: "La Torre de Hércules",
  paragraphs: [
    "La Torre de Hércules, en La Coruña (España), es el faro romano más antiguo que sigue funcionando. Fue construida en el siglo II y mide 55 metros de altura. Al principio, su luz se lograba con una hoguera encendida en la parte más alta; hoy funciona con una lámpara eléctrica que se ve desde más de 40 kilómetros mar adentro.",
  ],
  questions: [
    {
      id: "p1-luz",
      type: "literal",
      question: "¿Cómo se lograba la luz del faro al principio?",
      options: [
        { id: "a", text: "Con espejos de bronce." },
        { id: "b", text: "Con una hoguera en la parte alta." },
        { id: "c", text: "Con lámparas de aceite." },
        { id: "d", text: "Con una lámpara eléctrica." },
      ],
      correctId: "b",
    },
  ],
};

export function countWords(passage: DeepReadPassage): number {
  return passage.paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
}

// Notificaciones simuladas DENTRO de la app (nunca del sistema).
export const DEEP_READ_NOTIFICATIONS = [
  { id: "n1", app: "Mensajes", text: "Grupo Proyecto: ¿alguien tiene los apuntes de ayer?" },
  { id: "n2", app: "Calendario", text: "Recordatorio: entrega del informe mañana a las 8:00" },
  { id: "n3", app: "Social", text: "A 12 personas les gustó tu publicación" },
] as const;
