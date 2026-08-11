export interface SolarBody {
  id: string;
  name: string;
  color: string;
  radius: number; // world units (room-scale model)
  orbit: number; // orbit radius in world units (0 = Sun, fixed centre)
  orbitSpeed: number; // radians per second (scaled)
  spinSpeed: number; // radians per second (self rotation)
  ring?: boolean; // draw Saturn-style ring
  fact: { en: string; hi: string };
}

export const SOLAR_BODIES: SolarBody[] = [
  {
    id: 'sun',
    name: 'The Sun',
    color: '#ffb703',
    radius: 1.15,
    orbit: 0,
    orbitSpeed: 0,
    spinSpeed: 0.02,
    fact: {
      en: 'The Sun is a star at the centre of our solar system. It is a giant ball of hot glowing gas, and about one point three million Earths could fit inside it. It gives us the light and heat that make life on Earth possible.',
      hi: 'सूर्य हमारे सौरमंडल के केंद्र में एक तारा है। यह गर्म चमकती गैस का विशाल गोला है। अगर हम 1.3 मिलियन धरती को इसमें भरें, तो भी यह भर जाएगा। यह ही हमें प्रकाश और गर्मी देता है।',
    },
  },
  {
    id: 'mercury',
    name: 'Mercury',
    color: '#a8a29e',
    radius: 0.16,
    orbit: 1.9,
    orbitSpeed: 4.15,
    spinSpeed: 0.35,
    fact: {
      en: 'Mercury is the smallest planet and the closest to the Sun. A year on Mercury is only eighty eight Earth days, and its cratered surface is a lot like our Moon.',
      hi: 'बुध सबसे छोटा ग्रह है और सूर्य के सबसे पास है। बुध पर एक साल सिर्फ 88 धरती के दिनों का होता है। इसकी सतह हमारे चाँद जैसी गड्ढों वाली है।',
    },
  },
  {
    id: 'venus',
    name: 'Venus',
    color: '#fcd34d',
    radius: 0.3,
    orbit: 2.6,
    orbitSpeed: 1.62,
    spinSpeed: -0.2,
    fact: {
      en: 'Venus is the hottest planet, with a thick atmosphere of carbon dioxide that traps heat like a blanket. It spins backwards compared to most other planets.',
      hi: 'शुक्र सबसे गर्म ग्रह है। इसका घना कार्बन डाइऑक्साइड वातावरण गर्मी को कंबल की तरह फँसा लेता है। यह दूसरे ग्रहों के उल्टा घूमता है।',
    },
  },
  {
    id: 'earth',
    name: 'Earth',
    color: '#38bdf8',
    radius: 0.32,
    orbit: 3.4,
    orbitSpeed: 1.0,
    spinSpeed: 0.8,
    fact: {
      en: 'Earth is our home, the third planet from the Sun. It is the only planet we know with liquid water and life. It has one natural satellite, the Moon.',
      hi: 'पृथ्वी हमारा घर है, सूर्य से तीसरा ग्रह। यह एकमात्र ग्रह है जहाँ पानी और जीवन है। इसका एक प्राकृतिक उपग्रह है — चाँद।',
    },
  },
  {
    id: 'mars',
    name: 'Mars',
    color: '#f87171',
    radius: 0.24,
    orbit: 4.2,
    orbitSpeed: 0.53,
    spinSpeed: 0.75,
    fact: {
      en: 'Mars is the red planet, coloured by iron oxide, or rust, on its surface. It has the tallest volcano in the solar system, Olympus Mons.',
      hi: 'मंगल लाल ग्रह है। इसकी सतह पर मौजूद लोहे के ऑक्साइड, यानी जंग की वजह से यह लाल दिखता है। सौरमंडल का सबसे ऊँचा ज्वालामुखी, Olympus Mons, यहीं है।',
    },
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    color: '#f59e0b',
    radius: 0.85,
    orbit: 5.6,
    orbitSpeed: 0.084,
    spinSpeed: 1.2,
    fact: {
      en: 'Jupiter is the largest planet, a gas giant more massive than all the other planets combined. The Great Red Spot is a giant storm bigger than Earth.',
      hi: 'बृहस्पति सबसे बड़ा ग्रह है। यह गैस का विशालकाय गोला है और बाकी सभी ग्रहों से मिलकर भी ज़्यादा भारी है। Great Red Spot एक विशाल तूफान है जो पृथ्वी से बड़ा है।',
    },
  },
  {
    id: 'saturn',
    name: 'Saturn',
    color: '#e3b587',
    radius: 0.72,
    orbit: 6.9,
    orbitSpeed: 0.034,
    spinSpeed: 1.0,
    ring: true,
    fact: {
      en: 'Saturn is famous for its beautiful rings, made of ice and rock. It is a gas giant so light that it could float on water.',
      hi: 'शनि अपने सुंदर छल्लों के लिए प्रसिद्ध है, जो बर्फ और पत्थर के बने हैं। यह इतना हल्का गैस ग्रह है कि पानी पर तैर सकता है।',
    },
  },
  {
    id: 'uranus',
    name: 'Uranus',
    color: '#67e8f9',
    radius: 0.46,
    orbit: 8.0,
    orbitSpeed: 0.012,
    spinSpeed: -0.5,
    fact: {
      en: 'Uranus is an ice giant that spins on its side, rolling around the Sun like a ball. Methane gas gives it its blue-green colour.',
      hi: 'अरुण एक ice giant है जो करवट लेकर घूमता है। मीथेन गैस इसे नीला-हरा रंग देती है। यह सूर्य के चारों ओर गेंद की तरह लुढ़कता है।',
    },
  },
  {
    id: 'neptune',
    name: 'Neptune',
    color: '#3b82f6',
    radius: 0.44,
    orbit: 9.0,
    orbitSpeed: 0.006,
    spinSpeed: 0.6,
    fact: {
      en: 'Neptune is the windiest planet, with supersonic winds faster than the speed of sound. It is a deep blue ice giant and the farthest planet from the Sun.',
      hi: 'वरुण सबसे हवादार ग्रह है, यहाँ की हवाएँ ध्वनि की गति से भी तेज़ हैं। यह सूर्य से सबसे दूर वाला गहरा नीला ice giant है।',
    },
  },
  {
    id: 'moon',
    name: 'The Moon',
    color: '#cbd5e1',
    radius: 0.09,
    orbit: 0.85, // orbits Earth (attached to Earth's frame)
    orbitSpeed: 12.0,
    spinSpeed: 0.4,
    fact: {
      en: 'The Moon is Earth\'s natural satellite. It goes around Earth in about twenty seven days, and its gravity pulls on our oceans to create the tides.',
      hi: 'चाँद पृथ्वी का प्राकृतिक उपग्रह है। यह लगभग 27 दिनों में पृथ्वी का चक्कर लगाता है, और इसकी गुरुत्वाकर्षण ही ज्वार-भाटे पैदा करती है।',
    },
  },
];

export const PLANET_ORDER = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

export function bodyById(id: string): SolarBody | undefined {
  return SOLAR_BODIES.find((b) => b.id === id);
}

export const SYSTEM_SCALE = { min: 0.55, max: 1.9, default: 1.0 };

export const CAMERA_ORIGIN: [number, number, number] = [0, 3.4, 12.5];
