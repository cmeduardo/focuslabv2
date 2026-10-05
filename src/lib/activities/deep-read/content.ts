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
  // v2 (2026-10-05): 8 preguntas en vez de 5, con distractores tomados del
  // mismo texto (otras cifras, el caso contrario, datos ciertos que
  // responden a otra pregunta): la versión anterior se acertaba sin leer.
  id: "qanats-v2",
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
      id: "q1-pendiente-plana",
      type: "literal",
      question: "Según el texto, ¿qué ocurría si la pendiente del túnel era casi plana?",
      options: [
        { id: "a", text: "El agua corría con fuerza, erosionaba las paredes y causaba derrumbes." },
        { id: "b", text: "El agua se estancaba y el túnel se iba llenando de sedimentos." },
        { id: "c", text: "El caudal bajaba hasta igualar la recarga natural del acuífero." },
        { id: "d", text: "Los pozos verticales ya no alcanzaban a ventilar el túnel." },
      ],
      correctId: "b",
    },
    {
      id: "q2-inclinacion",
      type: "literal",
      question: "¿Cuál era la inclinación habitual del túnel?",
      options: [
        { id: "a", text: "Entre 20 y 35 metros de descenso por cada kilómetro recorrido." },
        { id: "b", text: "Entre 5 y 10 metros de descenso por cada kilómetro." },
        { id: "c", text: "Entre medio metro y un metro de descenso por cada kilómetro." },
        { id: "d", text: "Unos cien metros de descenso a lo largo de todo el recorrido." },
      ],
      correctId: "c",
    },
    {
      id: "q3-orden",
      type: "literal",
      question: "¿En qué orden se construía un qanat?",
      options: [
        {
          id: "a",
          text: "Primero el pozo madre; después el túnel, desde ese pozo y cuesta abajo hasta la llanura.",
        },
        {
          id: "b",
          text: "Primero el pozo madre; después el túnel, desde la llanura y cuesta arriba hasta ese pozo.",
        },
        {
          id: "c",
          text: "Primero el túnel, desde la llanura y cuesta arriba; después el pozo madre sobre su extremo.",
        },
        {
          id: "d",
          text: "Primero los pozos verticales del trazado; después se unían por abajo con el túnel.",
        },
      ],
      correctId: "b",
    },
    {
      id: "q4-gonabad",
      type: "literal",
      question: "¿Qué datos corresponden al qanat de Gonabad?",
      options: [
        { id: "a", text: "Unos 3000 años, pozo madre de más de 100 m y unos 35 km de recorrido." },
        { id: "b", text: "Unos 2700 años, pozo madre de cerca de 100 m y unos 20 km de recorrido." },
        { id: "c", text: "Unos 2700 años, pozo madre de unos 300 m y más de 30 km de recorrido." },
        { id: "d", text: "Unos 1000 años, pozo madre de cerca de 300 m y unos 40 km de recorrido." },
      ],
      correctId: "c",
    },
    {
      id: "q5-unesco",
      type: "literal",
      question: "¿Por qué reconoció la UNESCO a los qanats iraníes, según el texto?",
      options: [
        { id: "a", text: "Por ser la obra de riego más antigua del mundo que sigue en uso." },
        { id: "b", text: "Por funcionar sin energía y casi sin perder agua por evaporación." },
        { id: "c", text: "Por abastecer, entre los once, a unas cuarenta mil personas." },
        { id: "d", text: "Como ejemplo de gestión comunitaria del agua entre las familias." },
      ],
      correctId: "d",
    },
    {
      id: "q6-acuifero",
      type: "inference",
      question: "¿Por qué un qanat no agota el acuífero, a diferencia de una bomba moderna?",
      options: [
        { id: "a", text: "Porque el agua viaja bajo tierra y casi no se evapora en el camino." },
        { id: "b", text: "Porque su caudal depende de cuánta agua repone la montaña." },
        { id: "c", text: "Porque los turnos de riego limitaban el agua que usaba cada familia." },
        { id: "d", text: "Porque su pendiente suave hace que el agua corra despacio." },
      ],
      correctId: "b",
    },
    {
      id: "q7-canal-abierto",
      type: "inference",
      question: "Si el túnel se cambiara por un canal abierto en la superficie, ¿qué problema tendría, según el texto?",
      options: [
        { id: "a", text: "Sacaría más agua de la que la montaña alcanza a reponer." },
        { id: "b", text: "Se llenaría de sedimentos por quedar casi sin pendiente." },
        { id: "c", text: "Perdería buena parte del agua por el sol del verano." },
        { id: "d", text: "Ya no sería posible bajar a limpiarlo ni a repararlo." },
      ],
      correctId: "c",
    },
    {
      id: "q8-desnivel",
      type: "inference",
      question: "¿Qué hace indispensable que el pozo madre esté al pie de las montañas y no en la llanura?",
      options: [
        { id: "a", text: "Que el agua debe bajar desde más alto para llegar sola a los campos." },
        { id: "b", text: "Que solo al pie de las montañas llueve más de 250 milímetros al año." },
        { id: "c", text: "Que en la llanura el pozo tendría que superar los 300 metros." },
        { id: "d", text: "Que la tierra excavada solo podía sacarse por terreno inclinado." },
      ],
      correctId: "a",
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
