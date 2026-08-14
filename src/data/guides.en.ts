import type { Guide } from './types'

/**
 * 英文讲解与测验 —— 与 guides.zh.ts 一一对应。
 *
 * quiz 的 answer 是 options 的下标：翻译时调换了选项顺序，答案就指向
 * 错的那条，而页面上完全看不出异样，只有答题者发现「选对了却判错」。
 * parity.test.ts 专门盯着这一项。
 *
 * ⚠️ 内容由 AI 从中文翻译，未经专业核校。
 */
export const GUIDES: Record<string, Guide> = {
  'rhinoceros-beetle': {
    lesson: [
      {
        title: "How the Head Horn Fights",
        body: "A male's forked head horn (cephalic horn) is a lever, not a stabbing weapon: he wedges the tip under a rival's belly and heaves upward, flipping the opponent off the bark. Contests often end in seconds.",
        anchor: 'horn',
      },
      {
        title: "The Thoracic Horn's Role",
        body: "The head horn does the lifting while the short thoracic horn braces from below, pressing against the rival's body to form a pincer-like grip. Together they make the move steadier and less likely to slip.",
        anchor: 'thoraxHorn',
      },
      {
        title: "How the Antennae Track Sap",
        body: "The fan-tipped antennae (lamellate antennae) end in thin plates that stay folded, then fan open near a scent source to catch more odor molecules, guiding him by night to fermenting oak sap.",
        anchor: 'antenna',
      },
      {
        title: "A Brief Adult Life",
        body: "From egg to adult takes eight to ten months, the larva quietly feeding on rotting wood in the humus; the horned adult stage that follows often lasts only one to two months, the horn gear for a short finale.",
      },
    ],
    motion: {
      title: "The Horn Clash",
      body: "Two males lock horns head to head, each seeking to slide the tip under the rival's belly; once he succeeds he heaves upward, flipping the opponent off the bark. The move often takes under a second, and the loser backs off.",
    },
    quiz: [
      {
        question: "What does a male rhinoceros beetle's forked head horn mainly do in a fight?",
        options: ["Stab through a rival's elytra to kill it", "Act as a lever to lift and flip a rival", "Serve as a rudder during flight"],
        answer: 1,
        explain: "Rhinoceros beetles fight by leverage, using the horn tip to lift a rival off the bark; it is not a stabbing weapon and plays no part in flight.",
      },
      {
        question: "Which statement about the life of a rhinoceros beetle is correct?",
        options: [
          "The horned adult stage lasts only one or two months, while the larval stage is far longer",
          "Adult and larval lifespans are roughly equal, both a few months",
          "The larval stage is short, and most of its life is spent as a horned adult",
        ],
        answer: 0,
        explain: "The larval stage lasts eight to ten months, spent feeding in the humus; once the horned adult stage arrives, only one to two months of life remain.",
      },
    ],
    habitat: {
      title: "Humus and Sap Wounds",
      body: "By day it hides in humus or bark cracks, the damp shade evading predators; after dark it follows scent to oak and broadleaf trunks, sharing sap wounds with stag beetles and moths in the forest's nighttime feeding scene.",
    },
  },

  'monarch-butterfly': {
    lesson: [
      {
        title: "Orange and Black as Warning",
        body: "The forewing's orange with black veins is a warning color: toxins the caterpillar (larva) stored from milkweed persist into the adult, and a bird tasting the bitterness once remembers and avoids the pattern.",
        anchor: 'forewing',
      },
      {
        title: "Telling Males from Females",
        body: "Each hindwing carries a small black spot near its base, a male-only scent patch releasing courtship pheromones; females lack it and have thicker, darker veins, the clearest way to tell the sexes apart.",
        anchor: 'hindwing',
      },
      {
        title: "Navigating a Route Never Flown",
        body: "The generation migrating south has never seen Mexico, yet reaches the same fir forest its ancestors wintered in, guided by an antennal clock and the sun's angle—or, on cloudy days, Earth's magnetic field.",
        anchor: 'antenna',
      },
      {
        title: "How the Proboscis Sips Nectar",
        body: "The proboscis stays coiled like a watch spring, uncoiling to sip nectar in a flower's corolla; this structure, shared across Lepidoptera (butterflies and moths), replaces ancestral chewing mouthparts.",
        anchor: 'proboscis',
      },
    ],
    motion: {
      title: "Navigating by a Sun Compass",
      body: "Migrating monarchs track the sun's position, combined with an internal clock, to hold a fixed heading; over weeks, despite the sun's daily shift, they keep a southward course, converging on one fir forest valley in Mexico.",
    },
    quiz: [
      {
        question: "What is the main purpose of the monarch butterfly's bright orange and black wing pattern?",
        options: ["Attracting others of its kind for long-distance group recognition", "Warning predators of toxins stored in its body", "Helping regulate body temperature on long flights"],
        answer: 1,
        explain: "Toxins the caterpillar stores from milkweed persist into the adult body; the orange and black pattern warns birds it tastes bad and causes sickness.",
      },
      {
        question: "What allows monarchs that complete their autumn migration to reach their Mexican wintering grounds?",
        options: [
          "Following experienced older individuals who lead the way",
          "An internal sun compass and biological clock, switching to magnetic sensing on cloudy days",
          "A chain of pheromone scent left along the route",
        ],
        answer: 1,
        explain: "The generation flying south has never seen Mexico; it sets direction from the sun's angle and an internal clock, switching to Earth's field if cloudy.",
      },
    ],
    habitat: {
      title: "From Milkweed to Fir Forest",
      body: "During the breeding season, monarchs scatter across grasslands and fields, caterpillars depending solely on toxic milkweed; come autumn, adults mass-migrate to a few fir forests in Mexico, converging in one tiny wintering area.",
    },
  },

  honeybee: {
    lesson: [
      {
        title: "How the Waggle Dance Points",
        body: "A forager returns to the hive and runs a figure-eight on the comb, waggling her abdomen and using sound pulses from thorax muscles; dance direction matches the sun's bearing, waggle duration signaling distance.",
        anchor: 'thorax',
      },
      {
        title: "Carrying Pollen Home",
        body: "The hindleg's tibia is dished into a small pollen basket (corbicula); a worker brushes pollen off her body with her legs, pressing it into a compact pellet wedged in the basket, carried home to feed the larvae.",
        anchor: 'pollenBasket',
      },
      {
        title: "Why the Stinger Can Be Fatal",
        body: "A worker's stinger is barbed, so once it pierces thick mammal skin it cannot pull free; struggling tears her venom gland and innards, killing her. A queen's smooth, barbless stinger lets her sting repeatedly.",
        anchor: 'stinger',
      },
      {
        title: "How Compound Eyes Find Flowers",
        body: "The compound eyes sense ultraviolet light invisible to humans; many petals hide darker nectar guides visible only in ultraviolet, like runway lights leading the bee straight to the nectaries inside the flower.",
        anchor: 'eye',
      },
    ],
    motion: {
      title: "Shivering to Survive Winter",
      body: "When temperatures drop sharply, workers do not hibernate; they cluster around the queen, contracting flight muscles without moving their wings to generate heat. Outer bees swap places with those inside, keeping the core near 35°C.",
    },
    quiz: [
      {
        question: "What information does the duration of a honeybee's waggle dance mainly convey?",
        options: ["The species of flower at the nectar source", "The distance between the nectar source and the hive", "The day's weather conditions"],
        answer: 1,
        explain: "In the waggle dance, direction matches the sun's bearing toward the nectar source, while duration signals how far it is from the hive.",
      },
      {
        question: "Which statement about a honeybee's stinger is correct?",
        options: [
          "Both worker and queen stingers are barbed, and both die after stinging once",
          "Only the worker's stinger is barbed and she dies from torn innards after stinging; the queen's stinger is smooth and reusable",
          "A honeybee's stinger carries no venom at all, only physical pain",
        ],
        answer: 1,
        explain: "A worker's barbed stinger cannot be withdrawn once it pierces skin; struggling tears her innards and kills her. A queen's smooth stinger stings again.",
      },
    ],
    habitat: {
      title: "A Warm Society Inside the Hive",
      body: "Wild colonies nest in hollow trunks or rock crevices, kept colonies in hives; the nest holds about 35°C year-round and never hibernates. Workers forage within a two-to-three-kilometer radius, health tracking nearby blooming.",
    },
  },

  dragonfly: {
    lesson: [
      {
        title: "How Compound Eyes See the World",
        body: "The compound eyes cover nearly the whole head, built from close to 30,000 facets (ommatidia), giving a near-360-degree view with no blind spot; each facet senses moving light, key to catching prey midair.",
        anchor: 'eye',
      },
      {
        title: "Two Wing Pairs Flying Independently",
        body: "The forewings and hindwings, each driven by their own muscles, can beat out of sync: the dragonfly hovers like a helicopter and turns sharply or flies backward instantly, a level of control rare among insects.",
        anchor: 'forewing',
      },
      {
        title: "Legs That Form a Prey Basket",
        body: "Rows of bristles cover all six legs; in flight they fold into a funnel-shaped basket, and small insects like mosquitoes blundering in rarely escape. A dragonfly need not bite or chase—legs alone catch prey.",
        anchor: 'leg',
      },
      {
        title: "From Underwater to the Air",
        body: "The nymph, or naiad, lurks underwater for months to a year, a fierce ambush hunter on the pond bottom; its final molt, climbing out along water plants, brings wings and eyes, turning hunter aerial.",
      },
    ],
    motion: {
      title: "Intercepting Prey in Midair",
      body: "When hunting, a dragonfly does not just fix its gaze on prey; visual neurons compute its speed and direction, predict an interception point, and steer there. This intercept-not-chase tactic pushes success above ninety percent.",
    },
    quiz: [
      {
        question: "What is the key reason dragonflies keep such a high hunting success rate?",
        options: ["Compound eyes give a nearly 360-degree view with no blind spot", "Neurons predict prey trajectories and intercept ahead rather than chase", "Flight speed far exceeds that of any prey"],
        answer: 1,
        explain: "Visual neurons predict an interception point from the prey's path, so the dragonfly flies to where prey will be, not chasing—key to its high hit rate.",
      },
      {
        question: "Which statement about the dragonfly's development is correct?",
        options: [
          "It passes through egg, larva, pupa, and adult stages, which is complete metamorphosis",
          "The naiad molts directly into an adult with no pupal stage, which is incomplete metamorphosis",
          "The naiad develops on land, and only the adult takes to the water",
        ],
        answer: 1,
        explain: "Dragonflies undergo incomplete metamorphosis: the nymph (naiad) molts repeatedly underwater, emerging directly as an adult with no pupal stage.",
      },
    ],
    habitat: {
      title: "A Hunter Patrolling Its Territory",
      body: "An adult male holds a stretch of shoreline airspace, patrolling and chasing off intruding males to defend water females need for egg-laying; the nymph lurks in mud to ambush prey. One pond holds two very different life forms.",
    },
  },

  mantis: {
    lesson: [
      {
        title: "How Raptorial Forelegs Lock Prey",
        body: "The forelegs are sickle-shaped structures lined with sharp spines (raptorial forelegs); at rest they fold against the chest. Prey that nears triggers an instant snap, spines interlocking to pin it.",
        anchor: 'raptorialLeg',
      },
      {
        title: "How the Prothorax Assists the Strike",
        body: "The elongated prothorax, the thorax's front section, can suddenly extend like a telescoping rod, carrying the forelegs to strike from a distance prey never expects—key to the mantis's high hit rate.",
        anchor: 'prothorax',
      },
      {
        title: "How Far the Head Can Turn",
        body: "The head rotates nearly 180 degrees, scanning surroundings without moving its body, a trait rare among insects. A dark 'pseudopupil' seems to shift within the eye—an optical illusion, not an eyeball turning.",
        anchor: 'head',
      },
      {
        title: "A Green Ambusher in Disguise",
        body: "Its body is usually green or brown, sitting motionless among shrubs or grass, blending in and winning by camouflage, not speed. It never chases prey, waiting until a target nears—a textbook ambush predator.",
      },
    ],
    motion: {
      title: "One Strike Decides It",
      body: "The mantis waits motionless until prey enters range, then the prothorax extends as forelegs snap out—strike to lock takes under a tenth of a second, too fast to see. A strike cannot be recalled, so it waits rather than risk it.",
    },
    quiz: [
      {
        question: "When a mantis hunts, what is the main purpose of its forelegs closing?",
        options: ["Injecting venom to paralyze the prey", "Using rows of spines to lock the prey so it cannot escape", "Cutting the prey through like a pair of scissors"],
        answer: 1,
        explain: "A mantis's forelegs are raptorial legs lined with spines; striking locks the prey in place. It carries no venom and does not cut prey apart.",
      },
      {
        question: "Which of the following is true about this mantis species in North America?",
        options: [
          "It failed to adapt to the local climate and vanished soon after introduction",
          "Introduced as a pest predator, it became widely naturalized, with wild records of it ambushing hummingbirds",
          "It survives only in artificial greenhouse conditions and never established in the wild",
        ],
        answer: 1,
        explain: "Introduced to North America in 1896 as a pest predator, it naturalized quickly; wild records show it occasionally ambushes hummingbirds far larger.",
      },
    ],
    habitat: {
      title: "An Ambush Point in the Brush",
      body: "It favors shrubs, tall grass, or the tangled edges of farmland, where its green-and-brown coloring blends in. These settings let it hide and wait as pollinators, grasshoppers, and other prey pass through, natural ambush sites.",
    },
  },

  ladybird: {
    lesson: [
      {
        title: "Red and Black as a Warning",
        body: "The hardened forewings (elytra) show bright red dotted with black spots, a high-contrast pattern that in nature signals 'not food'; a bird tasting the bitterness once remembers and avoids the look.",
        anchor: 'elytra',
      },
      {
        title: "Defending Itself When Startled",
        body: "The real defense hides in the leg joints: when startled, a ladybird oozes bitter, irritating blood (hemolymph)—the chemical weapon the red-and-black pattern advertises, the color only an early warning.",
        anchor: 'leg',
      },
      {
        title: "Counting Spots to Tell Species",
        body: "The seven-spot ladybird takes its name from seven black spots on its elytra, but close relatives vary in number, from two to more than twenty; the spot pattern is a key way to tell ladybird species apart.",
        anchor: 'spot',
      },
      {
        title: "A Lifetime of Eating Aphids",
        body: "From larva to adult, the seven-spot ladybird eats almost nothing but aphids; a single larva can devour several hundred over its development, making it a natural pest controller relied on in farms and orchards.",
      },
    ],
    motion: {
      title: "Playing Dead as a Reflex",
      body: "When touched or approached by a predator, a ladybird snaps its legs and head in and drops off the leaf, playing dead; only if disturbed further do its legs ooze bitter hemolymph. This hide-then-defend response saves energy.",
    },
    quiz: [
      {
        question: "What is the main purpose of the seven-spot ladybird's red-with-black-spots coloring?",
        options: ["Helping it camouflage among flowers", "Warning predators that it tastes bad and contains bitter compounds", "Attracting others of its kind to cluster for winter"],
        answer: 1,
        explain: "The red-and-black pattern is a warning color matching the bitter hemolymph secreted when startled; predators remember and avoid it—not camouflage.",
      },
      {
        question: "Which statement about the black spots on a ladybird's elytra is correct?",
        options: [
          "Every ladybird species has exactly seven black spots",
          "The number and arrangement of spots vary by species and help distinguish ladybird species",
          "The number of spots increases year by year as the ladybird ages",
        ],
        answer: 1,
        explain: "Only the seven-spot ladybird has exactly seven spots; close relatives vary in number and arrangement, so spot patterns help tell species apart.",
      },
    ],
    habitat: {
      title: "Wherever Aphids Gather",
      body: "Wherever aphids cluster densely, seven-spot ladybirds gather too, favoring tender shoots at farmland, garden, and forest edges. Come autumn, adults migrate to rock crevices or leaf litter, dispersing each spring for new colonies.",
    },
  },

  ant: {
    lesson: [
      {
        title: "Why the Waist Is So Thin",
        body: "Between thorax and abdomen the body narrows into a tiny segment, the petiole, a flexible joint letting the gaster swing and curl to aim a sting; this narrow waist sets ants apart from other insects.",
        anchor: 'petiole',
      },
      {
        title: "What the Mandibles Can Do",
        body: "A major worker's jaws (mandibles) are as stout as pliers, used daily for cutting food, hauling debris, and defense; smaller nestmates have slenderer mandibles and handle more foraging and larval care.",
        anchor: 'mandible',
      },
      {
        title: "Carrying Honeydew Home",
        body: "Inside the gaster is an expandable crop storing nectar or aphid honeydew on the carry back; once full, a worker shares it mouth to mouth with nestmates, this 'social stomach' spreading food through the colony.",
        anchor: 'gaster',
      },
      {
        title: "Dividing Labor Without Eyesight",
        body: "Ants generally have limited eyesight, so coordination relies on antennal contact and pheromone scent: a worker finding food lays a scent trail to the nest, and nestmates follow it by scent alone.",
      },
    ],
    motion: {
      title: "Farming Aphids for Honeydew",
      body: "A carpenter ant taps an aphid's abdomen with its antennae, prompting it to release honeydew, licked up at once. In return, it drives off predators, sometimes moving the colony to a tenderer branch; farming can last a generation.",
    },
    quiz: [
      {
        question: "What is the main function of the noticeably narrow waist between an ant's thorax and abdomen?",
        options: ["Reducing body weight to make flying easier", "Letting the heavy hind abdomen turn and curl flexibly", "Serving as a cluster of breathing pores"],
        answer: 1,
        explain: "This narrow waist, the petiole, is a flexible joint letting the gaster swing for precise stinging or acid-spraying, not for weight or breathing.",
      },
      {
        question: "Which statement about the lifespan of this carpenter ant is correct?",
        options: [
          "A queen can live more than ten years, while most workers live less than two",
          "Workers and queens both live around one to two years, with little difference",
          "Workers outlive queens because egg-laying takes a heavy toll on the queen",
        ],
        answer: 0,
        explain: "A queen sheds her wings after mating, founding a nest for life, with a lifespan past ten years; workers outside typically live months to two years.",
      },
    ],
    habitat: {
      title: "An Underground City of Chambers",
      body: "The nest is usually built deep in soil, under rocks, or rotting wood, divided into brood chambers, food-storage rooms, and other spaces linked by tunnels; the queen lives in the innermost chamber, workers moving by role.",
    },
  },

  cicada: {
    lesson: [
      {
        title: "How the Song Is Made",
        body: "A male has a thin, ribbed membrane (tymbal) on each side of the abdomen; muscles contract hundreds of times a second, snapping it into a buzz. A cicada's call can exceed 90 decibels, among the loudest insects.",
        anchor: 'tymbal',
      },
      {
        title: "The Abdomen as a Speaker",
        body: "A male's abdomen is nearly hollow, like an instrument's resonance chamber, amplifying the tymbal's raw sound into a louder, farther-carrying call; females lack this and have a solid abdomen, so they never sing.",
        anchor: 'abdomen',
      },
      {
        title: "How the Mouthparts Sip Sap",
        body: "The mouthparts form a needle-thin piercing-sucking structure (rostrum), folded under the head at rest; feeding pierces a tree's xylem for sap, never biting or chewing leaves, often wrongly assumed leaf-eating.",
        anchor: 'rostrum',
      },
      {
        title: "Years Underground for Weeks Above",
        body: "The nymph lives underground three to five years, feeding on root sap and molting before it matures; after emerging, it climbs a trunk for one final molt, growing wings, yet the adult sings and flies only weeks.",
      },
    ],
    motion: {
      title: "Molting by Night to Emerge",
      body: "A mature nymph emerges at dusk, climbs a trunk, and grips the bark; its back splits, and a milky-white adult pulls free of the shell and unfurls crumpled wings. This takes one to two hours, defenseless till the wings harden.",
    },
    quiz: [
      {
        question: "What are a cicada's mouthparts mainly used for?",
        options: ["Chewing and biting leaves for nutrients", "Piercing a tree's xylem to feed on sap", "Preying on other small insects"],
        answer: 1,
        explain: "A cicada's mouthparts pierce the trunk's xylem for sap; it neither chews leaves nor preys on insects, though often mistaken for a leaf-eating pest.",
      },
      {
        question: "Does the cicada emerge en masse only once every many years, like North America's '17-year cicadas'?",
        options: [
          "Yes, it too waits a fixed number of years before appearing all at once",
          "No, nymphs are not synchronized underground, so they can be seen almost every summer",
          "No, in fact it only lives underground for a few weeks each year",
        ],
        answer: 1,
        explain: "Cicada nymphs live underground three to five years, not synchronized, so some emerge yearly, unlike a periodical cicada erupting once per many years.",
      },
    ],
    habitat: {
      title: "Between Root and Trunk",
      body: "The nymph lives hidden in soil around a tree's roots, developing on root sap; the adult moves to trunk and canopy, feeding, singing, and courting by day. One species thus occupies underground and treetop, rarely overlapping.",
    },
  },

  locust: {
    lesson: [
      {
        title: "How the Hindlegs Leap So Far",
        body: "The hindleg's femur is unusually thick, packed with jumping muscles; before a jump it coils like a spring, then releases instantly, launching the locust over ten body lengths—its fastest escape from predators.",
        anchor: 'hindleg',
      },
      {
        title: "How Crowding Triggers a Change",
        body: "Repeated touching of antennae and hindlegs by other locusts raises body serotonin; past a critical density, locusts shift from solitary to a bright, gregarious form—a physiological shift, not a genetic one.",
        anchor: 'antenna',
      },
      {
        title: "Wings Built for Long Migration",
        body: "In the gregarious form, wings grow longer than the body and flight muscles grow stronger, letting a swarm fly hundreds of kilometers without landing; the solitary form has shorter wings and relies on jumping.",
        anchor: 'wing',
      },
      {
        title: "How It Hears Its Neighbors",
        body: "Each side of the first abdominal segment carries a thin membrane, the eardrum (tympanum), picking up sound as locusts rub wings together. This ear sits on the abdomen, not the head, shared across grasshoppers.",
        anchor: 'tympanum',
      },
    ],
    motion: {
      title: "Swarms Migrating on the Wind",
      body: "Once a gregarious swarm takes to the air, individuals do not fly randomly; they keep formation by tracking wing-rubbing sounds and each other's position, riding the wind to save energy, covering dozens of kilometers a day.",
    },
    quiz: [
      {
        question: "What is the most direct trigger for a locust switching from the solitary to the gregarious form?",
        options: ["A new genetic mutation appearing in the population", "Repeated contact under high density triggering a change in serotonin levels", "A sharp temperature drop causing a color change"],
        answer: 1,
        explain: "The solitary and gregarious forms express the same genes differently: crowding raises serotonin, changing color and behavior—not a mutation.",
      },
      {
        question: "Where on the body is a locust's hearing organ (tympanum) located?",
        options: ["On the tibia of the foreleg", "On both sides of the first abdominal segment", "At the base of the antennae"],
        answer: 1,
        explain: "A locust's tympanum sits on both sides of the first abdominal segment, unlike katydids and crickets, whose hearing organs sit on the foreleg tibia.",
      },
    ],
    habitat: {
      title: "Between Grassland and Farmland",
      body: "The solitary form lives scattered across riverbanks and wasteland, feeding on wild grasses, easy to overlook; once vegetation withers and the population crowds into limited green, swarms shift and turn to farmland crops.",
    },
  },

  firefly: {
    lesson: [
      {
        title: "How the Cold Light Is Made",
        body: "Inside the light organ (lantern), luciferin reacts with oxygen, catalyzed by luciferase, releasing energy almost entirely as light, not heat—near ninety percent efficient versus a bulb's under ten.",
        anchor: 'lantern',
      },
      {
        title: "Flash Rhythm as a Signal",
        body: "Different firefly species vary in flash frequency, duration, and interval, each its own private code; a male's compound eyes scan dark grass in flight, built to lock onto his own species' exact rhythm.",
        anchor: 'eye',
      },
      {
        title: "How Antennae Find a Mate",
        body: "Beyond distinguishing flash rhythms, the serrated or thread-like antennae also sense minute pheromone traces in the air; scent backs up the light code, vital for females with reduced wings who cannot fly far.",
        anchor: 'antenna',
      },
      {
        title: "Larvae Glow Too",
        body: "The ability to glow appears in larvae, hiding in leaf litter by day and hunting snails and slugs at night. Research suggests a larva's faint glow warns predators of bad taste, unlike adult courtship signals.",
      },
    ],
    motion: {
      title: "A Call-and-Response in Light",
      body: "A male flies low over the grass, flashing repeatedly in his species' fixed rhythm; a female recognizing the signal replies with one flash after each of his, at a set delay. The male follows her light closer to complete the search.",
    },
    quiz: [
      {
        question: "Compared with an incandescent bulb, what is distinctive about the cold light a firefly's lantern produces?",
        options: [
          "It converts chemical energy into light far more efficiently than a bulb, with almost no heat",
          "It works on the same principle as a bulb, just dimmer",
          "It first absorbs and stores sunlight, releasing it again at night",
        ],
        answer: 0,
        explain: "A firefly's lantern glows through a luciferase reaction, converting energy at near ninety percent efficiency with almost no heat, far above a bulb's.",
      },
      {
        question: "When several firefly species share the same meadow, how does a female tell whether a flash comes from a male of her own species?",
        options: [
          "By flash color, since each species glows a different color",
          "By flash frequency and rhythm, since each species has its own private light code",
          "By the sound of the male's wings vibrating as he approaches",
        ],
        answer: 1,
        explain: "Firefly species vary in flash frequency, duration, and interval, like a private code; a female uses these differences, not color, to find a mate.",
      },
    ],
    habitat: {
      title: "Night Patrol Among Damp Leaves",
      body: "Both larvae and adults depend on damp conditions, sheltering by day under leaf litter or moss near streams; only after dark do adults fly. A habitat paved, drained, or lit by lamps makes this dark-dependent life hard to sustain.",
    },
  },
  'longhorn-beetle': {
    lesson: [
      {
        title: 'How Long Are the Antennae',
        body: "Black-and-white banded antennae reach nearly twice body length in males — the trait that most easily sets this beetle apart. Sensors on the antennae surface detect host-tree scent and mates' pheromones.",
        anchor: 'antenna',
      },
      {
        title: 'What the Mandibles Are For',
        body: 'The stout mandibles serve many uses: adults gnaw bark for food, and before laying eggs, females carve a notch, deposit eggs inside, then seal it with secretions so hatched grubs can bore into the trunk.',
        anchor: 'mandible',
      },
      {
        title: 'Reading the White-Spotted Elytra',
        body: 'Irregular white spots scatter across the black elytra, varying between beetles so no two look alike. This bold pattern makes it easy to spot on tree trunks — the opposite strategy from camouflaged beetles.',
        anchor: 'elytra',
      },
      {
        title: 'Wintering Inside the Trunk',
        body: 'After hatching, the grub bores from the notch into the sapwood, tunneling through trunk and roots to feed for one to two years, rarely emerging. This hidden habit makes detection and control especially hard.',
      },
    ],
    motion: {
      title: 'Boring a Tunnel Through the Trunk',
      body: "A hatched grub bores from the egg notch into the sapwood, pushing frass out as it advances with its mandibles. The tunnel winds along the grain for tens of centimeters until the grub pupates at its end one to two years later.",
    },
    quiz: [
      {
        question: 'Why does a female Citrus Longhorned Beetle carve a notch in the bark with her mandibles before laying eggs?',
        options: [
          'The notch marks territory to drive off other females',
          'Eggs are laid inside the notch and sealed, so hatched grubs can easily bore into the sapwood',
          "Sap oozing from the notch becomes the female's own food source",
        ],
        answer: 1,
        explain: 'The notch is sealed with secretions to protect the eggs inside, letting hatched grubs bore straight into the trunk to feed.',
      },
      {
        question: 'The Citrus Longhorned Beetle is native to East Asia — why has it established wild populations in several European countries?',
        options: [
          'It can fly long distances across open sea on its own',
          'It hitchhikes unnoticed on nursery stock and wooden packaging through trade',
          'Migratory birds carried its grubs to Europe',
        ],
        answer: 1,
        explain: 'Grubs hide unnoticed inside trunks, often reaching Europe and North America in nursery stock or wooden packaging — not by flying across the sea.',
      },
    ],
    habitat: {
      title: 'A Lifetime Hidden Inside Trunks',
      body: 'As grubs they live deep in the sapwood of living trees, tunneling from trunk base to roots, rarely seeing daylight. Only as adults do they chew through bark to roam forests, orchards, and city trees, gnawing bark, seeking mates.',
    },
  },

  'stick-insect': {
    lesson: [
      {
        title: 'How the Body Mimics a Twig',
        body: 'The slender, segmented body shifts color and texture with each molt, matching the plant it rests on, until nearly indistinguishable from a twig. This camouflage is fine-tuned molt by molt, not fixed once.',
        anchor: 'body',
      },
      {
        title: "Escaping a Predator's Grip",
        body: 'The six legs are slender as forked twigs; if gripped, the stick insect sheds the leg at a set joint to escape, sacrificing it to save its life. Nymphs can partly regrow a lost limb later; adults cannot.',
        anchor: 'leg',
      },
      {
        title: 'Swaying Along With the Wind',
        body: 'Staying still is not enough alone — real branches sway in a breeze. When disturbed or windblown, the stick insect rocks its body to mimic that swaying, reinforcing the disguise through behavior, not shape.',
        anchor: 'camouflage',
      },
      {
        title: 'A Small Head, Weak Eyesight',
        body: 'Compared with its disguised body, the head is small, with weak compound eyes; sight is not dominant. It finds its way and food through scent and touch via its antennae, unlike insects relying on vision to hunt.',
        anchor: 'head',
      },
    ],
    motion: {
      title: 'Eggs Disguised as Seeds',
      body: "Eggs mimic plant seeds in shape and scent, with a nutrient-rich appendage ants find appealing. Ants carry the egg into the nest as a seed, eat the appendage, and leave the shell in a refuse pile, where it hatches safely.",
    },
    quiz: [
      {
        question: 'Beyond staying still, why does a stick insect also rock its body gently when startled or when wind blows?',
        options: [
          'Rocking is a courtship display to attract mates',
          'It mimics the natural swaying of wind-blown branches, making the still disguise more convincing',
          'Rocking helps digest recently eaten leaves',
        ],
        answer: 1,
        explain: 'Staying perfectly still looks unnatural in a breeze, so it mimics swaying branches, reinforcing its disguise — unrelated to courtship or digestion.',
      },
      {
        question: 'Why do ants sometimes carry the eggs of some stick insects into their nest?',
        options: [
          'Ants mistake the eggs for their own larvae and tend them',
          'The eggs mimic seeds in shape and scent, and carry a nutrient-rich appendage ants find appealing',
          'Adult stick insects deliberately place their eggs in ant nests for protection',
        ],
        answer: 1,
        explain: 'These eggs mimic seeds and carry an appendage that lures ants, which carry them into the nest, eat it, and leave the eggs sheltered until they hatch.',
      },
    ],
    habitat: {
      title: 'Hidden Deep Among the Foliage',
      body: 'By day it stays motionless in the dense branches of shrubs, bamboo, or broadleaf forest, blending in so well it is rarely spotted. Only after nightfall does it stir to feed, then retreat before dawn.',
    },
  },

  swallowtail: {
    lesson: [
      {
        title: "The White Band Is the Male's Signature",
        body: 'A jade-white band crosses the hindwing; in males it is stable and barely varies, the most direct way to spot a male afield. Female patterns are far more variable, with several strikingly different forms.',
        anchor: 'hindwing',
      },
      {
        title: "Tricking a Bird's Beak With Tails",
        body: 'A slender tail from the hindwing tip, with nearby markings, forms a false antenna, tricking predators into striking the wing edge, not the head. Losing that corner lets it escape — better than losing the head.',
        anchor: 'tail',
      },
      {
        title: 'Why Females Disguise as a Toxic Species',
        body: 'Some females have forewing patterns mimicking the toxic Crimson Rose; harmless yet copying a toxic relative is called Batesian mimicry. A bird that learns to avoid a real Crimson Rose spares look-alikes too.',
        anchor: 'forewing',
      },
      {
        title: 'Siblings Can Hatch Into Different Forms',
        body: "A female's mimetic form is controlled as a unit by one gene stretch; within one brood, mimetic and non-mimetic females can hatch side by side, making the species a classic subject for studying mimicry genetics.",
      },
    ],
    motion: {
      title: 'Testing Host Plants With the Forelegs',
      body: "Before laying eggs, a female taps a leaf with her forelegs; chemoreceptors on her feet taste for citrus, Sichuan pepper, or another rue-family plant. Once confirmed, she lays eggs on the underside, so larvae find the right food.",
    },
    quiz: [
      {
        question: 'Some female Common Mormon butterflies mimic the highly toxic Crimson Rose swallowtail in wing pattern — what type of mimicry is this?',
        options: [
          'Both species are toxic, warning predators together',
          'Harmless itself, it fools predators by copying a toxic relative',
          'Pure coincidence, with no evolutionary link between the two species',
        ],
        answer: 1,
        explain: 'This is Batesian mimicry: the harmless female copies the toxic Crimson Rose, fooling predators that learned to avoid it into leaving her alone too.',
      },
      {
        question: 'What role do the hindwing tail and surrounding markings of the Common Mormon play in defending against predators?',
        options: [
          'They mimic a false antenna and head, drawing attacks to the wing edge rather than a vital spot',
          'They store extra fat reserves used during flight',
          'They help maintain aerodynamic balance during sharp turns',
        ],
        answer: 0,
        explain: 'The tail and markings form a false head, tricking predators into biting the wing edge; losing that corner lets it fly off, not a bite to its head.',
      },
    ],
    habitat: {
      title: 'Orchards and City Gardens',
      body: 'Larvae depend on citrus, Sichuan pepper, and other rue-family plants, so this butterfly turns up in gardens, street trees, and orchards, adapting well to settlements. Adults range wider for flowers, often at beds and fruit trees.',
    },
  },

  'silk-moth': {
    lesson: [
      {
        title: 'Eyespots That Startle Predators',
        body: 'Each forewing and hindwing carries one transparent eyespot, normally hidden. If disturbed, the moth flicks its wings open, revealing them like wide-open eyes — enough to make an attacker hesitate and miss.',
        anchor: 'eyespot',
      },
      {
        title: 'Feathery Antennae for Finding Mates',
        body: "Male moths have broad, feather-like antennae covered in scent receptors that detect pheromones released by females hundreds of meters away — far sharper than their eyes, and the main way they find mates.",
        anchor: 'antenna',
      },
      {
        title: 'Warming Up Before Flight',
        body: 'The thorax is densely furred, wrapping well-developed flight muscles; before takeoff the moth must warm them by vibrating until the thorax reaches a set temperature — a trait common among large-bodied moths.',
        anchor: 'thorax',
      },
      {
        title: 'Adults Never Eat Again',
        body: "By the time it emerges, its mouthparts have degenerated past feeding function, and it never eats again. In its short adult life of about a week, all its energy goes toward one task — mating and laying eggs.",
      },
    ],
    motion: {
      title: 'Spinning a Cocoon for Shelter',
      body: 'Before pupating, a larva wraps itself in silk from its glands, anchoring a pad, then weaves the cocoon by swinging its head in a figure eight. The unbroken thread runs over a kilometer, sheltering the pupa through metamorphosis.',
    },
    quiz: [
      {
        question: 'Why does the adult Chinese Oak Silkmoth never eat again after emerging?',
        options: [
          'Its mouthparts have degenerated and lost the ability to feed',
          'Food is scarce nearby, forcing it to fast',
          'Feeding would interfere with releasing pheromones',
        ],
        answer: 0,
        explain: "The adult's mouthparts have degenerated and cannot feed; it survives on nutrients stored as a larva, which is why adult life lasts only about a week.",
      },
      {
        question: "What is the main function of the transparent eyespots on the Chinese Oak Silkmoth's fore- and hindwings?",
        options: [
          'Glowing at night to attract mates',
          "Suddenly revealed when startled, to deter or delay a predator's attack",
          'Regulating body temperature by absorbing sunlight',
        ],
        answer: 1,
        explain: 'The eyespots stay hidden until startled, when the moth flicks its wings open, resembling eyes; this makes a predator hesitate, buying time to flee.',
      },
    ],
    habitat: {
      title: 'Two Generations in the Oak Woods',
      body: 'Larvae feed on oak and beech-family leaves as they grow, rarely straying far from the host tree. After spinning cocoons, they wait out winter before emerging; adult life is brief, but moths return to the same woods to mate.',
    },
  },

  hornet: {
    lesson: [
      {
        title: 'Mandibles Built for Killing',
        body: "Its thick, sickle-shaped mandibles are its main weapon for killing honeybees; raiding a hive, it can sever a worker's head and thorax instantly. Dozens attacking together can wipe out a colony within hours.",
        anchor: 'mandible',
      },
      {
        title: 'A Sting That Can Be Reused',
        body: "Its sting is smooth and barbless, so it can be withdrawn and reused, unlike a honeybee's stinger, which kills the bee after one use. Each sting delivers far more venom, dangerous to large predators and humans.",
        anchor: 'sting',
      },
      {
        title: 'A Slender Waist for Aerial Combat',
        body: 'A narrow waist (petiole) links thorax and abdomen, letting the body flex easily; with strong flight muscles, it changes direction instantly and grapples at close range, at up to 40 kilometers per hour.',
        anchor: 'waist',
      },
      {
        title: 'A Colony That Lives Just One Season',
        body: "A hornet colony, unlike a honeybee's, restarts each spring from one overwintered queen and grows through summer and fall. New queens leave to overwinter before winter, and the old nest dies out.",
      },
    ],
    motion: {
      title: 'A Bee Ball That Cooks the Invader',
      body: "When honeybees detect a scout hornet, hundreds swarm it into a ball, vibrating flight muscles to generate heat. Temperature nears 45 degrees Celsius — above the hornet's limit but within the bees' own — enough to roast it alive.",
    },
    quiz: [
      {
        question: "What is the biggest difference between an Asian Giant Hornet's sting and a honeybee's stinger?",
        options: [
          "The hornet's sting carries no venom, only physical pain",
          "The hornet's sting is smooth and barbless, so it can be withdrawn and reused",
          'Hornets have no sting at all and attack only with their mandibles',
        ],
        answer: 1,
        explain: "The hornet's sting is smooth and barbless, reused each time with more venom; a honeybee's barbed stinger tears loose after one use, killing the bee.",
      },
      {
        question: 'How do Japanese honeybees defend themselves against a scouting raid by an Asian Giant Hornet?',
        options: [
          'The whole colony flies away, abandoning the hive',
          'Workers swarm the intruder, encircling it and vibrating to generate heat until it overheats and dies',
          'They surround and sting the intruder to death all at once',
        ],
        answer: 1,
        explain: "Workers engulf the hornet and vibrate to generate heat; the ball's core nears 45 degrees Celsius, hot enough to kill it without harming the bees.",
      },
    ],
    habitat: {
      title: 'Nests Underground and in Tree Hollows',
      body: 'Nests are usually built in underground cavities or tree hollows in low hill forests, hidden and hard to find. Workers range kilometers out, preying on bees and insects for protein and eating tree sap and fallen fruit for sugar.',
    },
  },

  'tiger-beetle': {
    lesson: [
      {
        title: 'Scissor-Like Mandibles for Hunting',
        body: 'Sickle-shaped mandibles cross like scissors, closing off-center at rest; it lunges and snaps shut, crushing the exoskeleton of ants and other prey — with blistering speed, a top predator on forest trails.',
        anchor: 'mandible',
      },
      {
        title: 'Too Fast to See Clearly',
        body: 'Its large compound eyes lock onto prey, but at top speed they cannot keep up with the changing image, causing brief blindness. That is why tiger beetles sprint a few steps, stop, then dash again in bursts.',
        anchor: 'eye',
      },
      {
        title: 'Legs Behind an Insect Sprint Record',
        body: 'Its three pairs of slender legs support extremely fast running; measured in body lengths per second, it ranks near the top among insects. This speed serves both for chasing prey and escaping predators.',
        anchor: 'leg',
      },
      {
        title: 'Larvae Ambush From Their Burrows',
        body: 'Larvae do not run; they hide in a self-dug burrow, anchored by abdominal hooks while the head plugs the entrance, disguised as ground. A wandering insect is seized in a lunge — unlike the adult pursuit.',
      },
    ],
    motion: {
      title: 'An Ambush Strike From the Burrow',
      body: "The larva's head and forebody fuse into a plug sealing the burrow entrance. When prey draws near, it braces on abdominal hooks and springs out, seizing the target with its mandibles, then hauls it back into the burrow to feed.",
    },
    quiz: [
      {
        question: 'Why does a Chinese Tiger Beetle often sprint just a few steps and then stop abruptly?',
        options: [
          'It burns energy too fast and needs frequent rest',
          'Its speed outpaces what its compound eyes can process, leaving it briefly unable to see clearly ahead',
          'It stops to wait for prey to approach on its own',
        ],
        answer: 1,
        explain: "At top speed the beetle's eyes cannot keep up with the changing image and briefly go blind, so it stops to relocate its prey — not from fatigue.",
      },
      {
        question: 'Which statement correctly describes how Chinese Tiger Beetle larvae hunt?',
        options: [
          'Like adults, they chase prey by running fast across the ground',
          'They lurk in a vertical burrow, disguising its entrance to ambush passing prey',
          'They spin a web and wait, trapping prey with sticky silk',
        ],
        answer: 1,
        explain: 'Larvae never chase prey; they lurk in a burrow, anchored by abdominal hooks with the head disguising the entrance, striking when prey draws near.',
      },
    ],
    habitat: {
      title: 'Territory on Bare Ground and Trails',
      body: 'Adults favor sunny, sparse sandy trails and riverbank clearings; open terrain suits high-speed hunting and lets them spot predators early. Larvae stay confined to their burrow, struggling to defend themselves away from that shaft.',
    },
  },

  'stag-beetle': {
    lesson: [
      {
        title: 'How the Mandibles Do Battle',
        body: "Sharp-toothed mandibles along the inner edge are the male's main weapon for sap spots and mates. Rivals cross mandibles, clamp bodies, and heave up to flip the loser off the trunk; the holder claims the wound.",
        anchor: 'mandible',
      },
      {
        title: 'A Wide Head for a Strong Bite',
        body: "The broad, flattened head conceals strong muscles that power the mandibles' bite. The wider and stronger the head, the longer a male can clamp down, giving him the edge in a drawn-out standoff.",
        anchor: 'head',
      },
      {
        title: 'Claws That Withstand the Strain',
        body: 'Sharp claws at the leg tips hook tightly into the rough bark grain. When a rival clamps down and hauls at his body, the grip of these small claws decides whether he holds his ground or gets flipped.',
        anchor: 'leg',
      },
      {
        title: 'Siblings Can Grow Worlds Apart',
        body: 'Larval nutrition determines adult mandible length; brothers from one brood fed differently can emerge with mandibles differing over double. Smaller-mandibled males often turn to ambush tactics for a sap spot.',
      },
    ],
    motion: {
      title: 'A Grapple to Lift and Flip',
      body: "Two males lock mandibles and heave upward together; whoever gets thrown off the trunk loses. Most bouts are ritualized strength tests that rarely pierce a rival's elytra, and the loser finds a new sap wound elsewhere.",
    },
    quiz: [
      {
        question: 'Why can the mandible length of male Chinese Stag Beetles from the same brood differ so much after they emerge?',
        options: [
          'It is determined entirely by genes; nutrition has no effect on mandible shape',
          'Different nutrition levels during the larval stage directly affect how the adult mandibles develop',
          'It is just measurement error; the actual difference is small',
        ],
        answer: 1,
        explain: 'Mandible length is shaped by larval nutrition; if feeding varies within a brood, mandibles can end up differing over double, not simply genetics.',
      },
      {
        question: 'How does a male Chinese Stag Beetle with smaller mandibles usually behave when facing a rival with stout mandibles?',
        options: [
          "He fights to the death, until he pierces the rival's elytra",
          'He switches to ambush or opportunistic tactics, seizing a sap spot when the chance arises',
          'He abandons that sap spot entirely and never contests one again',
        ],
        answer: 1,
        explain: 'A male with smaller mandibles is disadvantaged head-on, so he shifts to ambush tactics, seizing a sap spot while a rival is distracted.',
      },
    ],
    habitat: {
      title: 'Rotten Wood and Sap Wounds',
      body: 'Larvae live inside rotting logs or hollows, feeding on decomposing wood, rarely seeing light. Adults, active by night, lick sap from trunk wounds shared with other stag or rhinoceros beetles, resting by day in bark or leaf litter.',
    },
  },

  'jewel-beetle': {
    lesson: [
      {
        title: 'A Color That Is Not Painted On',
        body: 'The elytra look glazed in shimmering gold-green and red, but dozens of nanometer layers stack beneath the cuticle; light interferes between them to produce color, unlike pigment. Tilt it and the color shifts.',
        anchor: 'elytra',
      },
      {
        title: 'Two Stripes That Catch the Eye',
        body: 'Two red-purple stripes run along the elytra where structural color layering is densest, reflecting light more brightly than nearby areas — the clearest clue for telling it apart from relatives.',
        anchor: 'stripe',
      },
      {
        title: 'Small Eyes, Still Finding the Tree',
        body: "Its compound eyes are not especially large, but remain its main sense for locating a host tree crown. Adults stay at the sunlit treetop, spotting a weakened tree or another beetle from a distance.",
        anchor: 'eye',
      },
      {
        title: 'Why Specimens Never Fade',
        body: "Pigment colors oxidize and fade, but structural color depends only on layer thickness and arrangement, so it never ages while intact. Elytra inlaid on Horyuji's Tamamushi Shrine still show iridescence today.",
      },
    ],
    motion: {
      title: 'Elytra That Shift Color in Flight',
      body: 'As it takes flight, elytra shift with body tilt and light angle, and green, red, and purple tones flicker as if the insect were changing color midair. This belongs only to structural color — pigment looks the same from any angle.',
    },
    quiz: [
      {
        question: "How does the metallic sheen of the Japanese Jewel Beetle's elytra come about?",
        options: [
          "Pigment secreted by the cuticle settles on the elytra's surface",
          'Interference of light across multiple layers beneath the cuticle, unrelated to pigment',
          'Surface rusting caused by prolonged sun exposure and oxidation',
        ],
        answer: 1,
        explain: "This is structural color: nanometer layers beneath the cuticle interfere with light to produce color, shifting with viewing angle — unlike pigment.",
      },
      {
        question: 'Why do Japanese Jewel Beetle elytra specimens stay vivid even after a century?',
        options: [
          'Ancient craftsmen coated the specimens with a special preservative lacquer',
          'The color comes from the layered structure rather than pigment, so it does not oxidize and fade as long as the shell stays intact',
          'The elytra material itself grows more vivid over time',
        ],
        answer: 1,
        explain: "Pigment fades over time as it oxidizes, but structural color depends only on layer thickness, so while intact, it will not age like pigment.",
      },
    ],
    habitat: {
      title: 'Sun-Loving Visitors of the Canopy',
      body: 'Adults spend most of their time at sunlit treetops of hackberry, camphor, and other host trees, rarely descending. Larvae, opposite, hide inside weakened or dead wood boring through sapwood — both stay bound to the same host tree.',
    },
  },

  katydid: {
    lesson: [
      {
        title: 'Ears Located on the Front Legs',
        body: "The katydid's hearing organ (tympanum) sits on the front leg's shin, not the abdomen; thin membranes sense other katydids' wing calls. Grasshoppers hear via the abdomen — a clear way to tell them apart.",
        anchor: 'tympanum',
      },
      {
        title: 'Antennae Longer Than the Body',
        body: 'Its thread-like antennae often run two to three times body length, hanging forward and waving ahead. Grasshopper antennae are much shorter and stockier, so length alone often tells the two apart.',
        anchor: 'antenna',
      },
      {
        title: 'How the Forewings Produce Sound',
        body: "At the base of the male's left forewing sits a toothed file, while the right edge carries a scraper; the wings rub, dragging file across scraper to produce a loud call, courting females and claiming territory.",
        anchor: 'wing',
      },
      {
        title: 'Good at Jumping, Not at Flying',
        body: 'The hindleg femurs are powerful, letting it leap far as its first response to danger. Its wings are weaker than its jump, so it covers distance by hopping and crawling, rarely flying long like grasshoppers.',
        anchor: 'hindleg',
      },
    ],
    motion: {
      title: 'Waves of Rival Territorial Calls',
      body: 'After nightfall, several males in the grass call in turns: one starts, others answer, sometimes outdoing the volume, building a wave of sound — a courtship display and a vocal contest marking territory without direct fighting.',
    },
    quiz: [
      {
        question: "Where on its body is the Chinese Katydid's hearing organ (tympanum) located?",
        options: [
          'On either side of the first abdominal segment, same as grasshoppers',
          "On the shin of the front leg, a different spot from grasshoppers",
          'Near the base of the antennae on the head',
        ],
        answer: 1,
        explain: "The katydid's hearing organ sits on the front leg shin, unlike grasshoppers, whose organ sits on the abdomen — a reliable way to tell them apart.",
      },
      {
        question: 'Based on antenna length alone, how can you roughly tell a katydid from a grasshopper?',
        options: [
          "A katydid's antennae are far longer than its body, while a grasshopper's are noticeably short and stocky",
          'Their antenna lengths are actually about the same, so this cannot tell them apart',
          'Grasshopper antennae are longer, katydid antennae shorter',
        ],
        answer: 0,
        explain: "A katydid's antennae often exceed body length by two to three times, while grasshopper antennae are much shorter — a quick way to tell them apart.",
      },
    ],
    habitat: {
      title: 'A Singer of Bean Vines and Grass',
      body: 'By day it hides among stems and leaves of legumes and grasses, feeding on leaves, flowers, and fruit, its color blending in. After nightfall it calls loudly nearby — the same patch is often heard singing year after year.',
    },
  },

  'mole-cricket': {
    lesson: [
      {
        title: 'Forelegs Are Shovels, Not Springs',
        body: 'Its forelegs are flat, shovel-like tools with hard teeth on the shin for loosening and pushing soil forward. All its power goes into digging, so jumping is weak; when threatened, it burrows instead of leaping.',
        anchor: 'foreleg',
      },
      {
        title: 'A Shield-Shaped Plate for Pushing On',
        body: 'The plate behind the head (pronotum) swells into a rounded shield covering the neck and foreleg base; through a tunnel, it acts like a cap, pushing loosened soil aside and cutting friction against the wall.',
        anchor: 'pronotum',
      },
      {
        title: 'Sensing Vibration With the Cerci',
        body: 'A pair of sensory appendages (cerci) at the abdomen tip is sensitive to faint vibrations through ground and tunnel walls. Even in complete darkness, it uses these to sense a predator or prey well in advance.',
        anchor: 'abdomen',
      },
      {
        title: 'Occasionally Takes to the Air',
        body: 'Most of the time it lives underground and rarely surfaces. During nighttime dispersal, it unfolds hindwings tucked beneath short forewings for short flights, and is drawn to light — why it turns up near lamps.',
        anchor: 'wing',
      },
    ],
    motion: {
      title: 'Digging Like a Breaststroke Swimmer',
      body: 'In soft, moist soil, it digs by alternating forelegs, like a breaststroke swimmer: one leg sweeps soil outward while the other draws back for the next stroke, and the pronotum pushes dirt aside. A new tunnel forms in minutes.',
    },
    quiz: [
      {
        question: 'When facing a predator, how does the Oriental Mole Cricket usually escape danger?',
        options: [
          'Like a grasshopper, it leaps far away using powerful hindlegs',
          'Its forelegs are not built for jumping, so it escapes by quickly burrowing into loose soil',
          'It unfolds its wings and flies off immediately',
        ],
        answer: 1,
        explain: "The mole cricket's forelegs are built for digging, not jumping, so it burrows into loose soil when threatened, unlike grasshoppers or crickets.",
      },
      {
        question: 'The Oriental Mole Cricket burrows and feeds year-round in farmland soil — what objective effect does this have on the soil itself?',
        options: [
          'Its digging compacts the soil, hindering root growth',
          'Its digging loosens the soil, promoting air and water penetration',
          'Its digging has no effect at all on soil structure',
        ],
        answer: 1,
        explain: 'Feeding on roots and seedlings makes it a farmland pest, but its burrowing loosens soil and aids water penetration — a benefit often overlooked.',
      },
    ],
    habitat: {
      title: 'Tunnels Through Soft Soil Layers',
      body: 'It favors soft, moist soil easy to dig, like farmland, vegetable plots, and riverbanks, staying deep in tunnels by day and moving toward the surface at night to feed. It avoids compacted or dry ground where burrowing is hard.',
    },
  },
  'water-strider': {
    lesson: [
      {
        title: 'Standing on water is not about weight',
        body: 'A waxy coat and dense water-repellent hairs on the mid- and hindlegs amplify surface tension enough to bear its weight. Shave the hairs off, and it sinks at once.',
        anchor: 'body',
      },
      {
        title: 'The midlegs work like oars',
        body: 'The midlegs, longest of the three pairs, row side to side like oars, providing most propulsive thrust — letting it dash away instantly to dodge fish lurking below.',
        anchor: 'midleg',
      },
      {
        title: 'Spotting prey that falls in',
        body: 'The compound eyes bulge outward for a wide view, detecting the ripples of struggling prey. It glides over fast and pins the catch with its short, strong forelegs.',
        anchor: 'eye',
      },
      {
        title: 'Hindlegs handle braking and turns',
        body: 'Midlegs provide thrust; hindlegs steer and brake. Together the two pairs let it turn sharply or stop short on open water — far more agile than most aquatic insects.',
        anchor: 'hindleg',
      },
    ],
    motion: {
      title: 'A vertical leap straight off the water',
      body: 'Escaping a fish strike, it springs straight up off the surface. All six legs must press down with gradually rising force — too hard and the surface film breaks, dropping it through.',
    },
    quiz: [
      {
        question: 'What mainly keeps a water strider from sinking when it stands on the water?',
        options: [
          'It is extremely light, so it barely presses on the surface',
          'Dense water-repellent hairs on its legs amplify surface tension enough to bear its weight',
          'It secretes oil that keeps its whole body from getting wet at all',
        ],
        answer: 1,
        explain: 'Dense water-repellent leg hairs amplify surface tension enough to bear its weight. Shave them off, and it sinks at once — not a matter of weight.',
      },
      {
        question: "Which statement correctly describes the division of labor among a water strider's three leg pairs?",
        options: [
          'The forelegs row for propulsion, while the mid- and hindlegs grip prey',
          'The midlegs provide most of the propulsion, the forelegs grip prey, and the hindlegs steer and brake',
          'All three leg pairs serve the same function and can substitute for one another',
        ],
        answer: 1,
        explain: 'The longest midlegs provide the main thrust; short forelegs grip prey; hindlegs steer and brake — each pair has its own, non-interchangeable job.',
      },
    ],
    habitat: {
      title: 'A floating world on still water',
      body: 'It favors calm ponds and slow streams, gliding on surface tension to hunt. Because pollution weakens that tension, its population density is often used to gauge water cleanliness.',
    },
  },

  hoverfly: {
    lesson: [
      {
        title: 'Only one wing pair, yet it hovers',
        body: 'True flies (Diptera) have specialized hindwings, so it flies on one forewing pair alone — yet it hovers, flies backward, and turns instantly, outdoing many four-winged bees.',
        anchor: 'wing',
      },
      {
        title: 'How the halteres keep it stable',
        body: "The hindwings have shrunk into club-shaped halteres that beat rapidly in flight, sensing the body's rotation and tilt and feeding that data back for balance.",
        anchor: 'haltere',
      },
      {
        title: 'Black-and-yellow stripes are a bluff',
        body: 'Black-and-yellow abdominal bands copy the warning colors of bees and wasps, making predators hesitate. In truth it has no stinger at all — the pattern is pure bluff.',
        anchor: 'abdomen',
      },
      {
        title: 'Telling males from females by the eyes',
        body: "Males' compound eyes nearly meet in a line atop the head; females keep a clear gap between them — the quickest way to sex a hoverfly in the field.",
        anchor: 'eye',
      },
    ],
    motion: {
      title: 'Larvae hunt aphid colonies by night',
      body: 'The maggot-like larva hunts fast: its mouth hooks snap an aphid up, impale it, and drain it dry, working through dozens in one night. Denser colonies only raise its kill rate.',
    },
    quiz: [
      {
        question: 'The hoverfly is black and yellow and looks much like a bee or wasp, but in fact it —',
        options: [
          'Has a stinger just like bees do, but rarely uses it',
          'Has no stinger at all and cannot sting — the colors are only a disguise',
          'Has a stinger reduced to a weaker, needle-like mouthpart',
        ],
        answer: 1,
        explain: 'As a true fly, it has no stinger and cannot sting at all. The pattern only mimics bee warning colors to scare off predators — pure bluff.',
      },
      {
        question: 'What lets the hoverfly fly as nimbly as a bee, even hovering with ease?',
        options: [
          'Two wing pairs working together, just like bees',
          'Just one wing pair, paired with club-shaped halteres that sense body position',
          "Only one wing pair, but far larger than a bee's wings",
        ],
        answer: 1,
        explain: 'It flies on one forewing pair; its hindwings are club-shaped halteres that sense body position and aid stability, not a second wing pair.',
      },
    ],
    habitat: {
      title: 'Between the flowerbed and the aphids',
      body: 'Adults visit flowers in gardens, farmland, and forest edges for nectar and pollen, pollinating as they go. Females lay eggs near aphid-thick branches so larvae can hunt right away.',
    },
  },

  lacewing: {
    lesson: [
      {
        title: 'Gold-bronze eyes are the easiest tell',
        body: 'The compound eyes gleam gold-bronze, the quickest field mark for a lacewing. Striking as they look, they are not especially sharp — mainly sensing light and movement.',
        anchor: 'eye',
      },
      {
        title: 'Net-like veins brace the thin wings',
        body: 'Both slender wing pairs carry a crisscrossing mesh of wing veins that reinforces the fragile wing and gives it a faint shimmer — the source of the name Neuroptera.',
        anchor: 'wing',
      },
      {
        title: 'How the larva disguises itself as debris',
        body: "The larva's long, hairy legs suit fast aphid chases. After draining a victim it piles the husk on its back, hiding among prey debris to stalk the next target unnoticed.",
        anchor: 'leg',
      },
      {
        title: 'Eggs dangle from silken stalks',
        body: 'Before laying, the female spins a silk thread and sets her egg on its tip, suspended above the leaf. This keeps cannibalistic hatchlings from eating the rest of the clutch.',
      },
    ],
    motion: {
      title: 'Courtship in a code of vibrations',
      body: "Courting lacewings do not call out; they shake their abdomens rhythmically, sending vibrations through the perch. The partner feels this \"code\" and shakes back before they mate.",
    },
    quiz: [
      {
        question: 'Why does the lacewing larva pile drained aphid husks on its own back?',
        options: [
          'Leftover fluid in the husks serves as backup food',
          'It hides among the prey debris to sneak up on the next target and evade predators',
          'The husks reflect sunlight and help regulate its body temperature',
        ],
        answer: 1,
        explain: 'The larva carries empty husks as camouflage, letting it sneak up on aphids and dodge predators — not to store food or regulate heat.',
      },
      {
        question: 'The order Neuroptera, to which the green lacewing belongs, is named mainly for which feature?',
        options: [
          'Wings covered in bold, net-like veins resembling fine leaf veins',
          'Wings entirely reduced, leaving only vein-like traces behind',
          'An unusually developed blood-vessel system in both larva and adult',
        ],
        answer: 0,
        explain: "Neuroptera is named for the finely crisscrossing, net-like wing veins on its wings, which reinforce the thin wing and help identify the group.",
      },
    ],
    habitat: {
      title: 'A hunting base among the leaves',
      body: 'Adults live among branches and leaves of farmland, orchards, and forest edges, still by day and active foragers at night, drawn to lights. Females lay eggs near aphid-thick twigs.',
    },
  },

  earwig: {
    lesson: [
      {
        title: 'What the forceps are actually for',
        body: "A pair of curved forceps at the abdomen's tip is its main weapon — curved and asymmetrical in males, straighter in females — used against predators, not human ears.",
        anchor: 'forceps',
      },
      {
        title: 'Why the wing covers are so short',
        body: "The forewings form a pair of very short, leathery elytra reaching only the first few segments, leaving the rest of the abdomen bare — unlike beetles' full-length elytra.",
        anchor: 'elytra',
      },
      {
        title: 'How narrow a gap the flat head enters',
        body: 'The flattened head presses close to the ground, letting it slip into tight gaps between rocks and driftwood, where it hides by day from sun and predators until dark.',
        anchor: 'head',
      },
      {
        title: 'Why the abdomen can arch backward',
        body: 'The last abdominal segments arch sharply upward, even over the head, so the forceps can strike from above or behind — making up for its slow, flightless defense.',
        anchor: 'abdomen',
      },
    ],
    motion: {
      title: 'A mother guards her eggs to hatching',
      body: 'After laying, the female stays by the egg cluster, licking eggs to clear mold and gathering strays into a pile. Disturbed eggs get carried back one by one — rare care among insects.',
    },
    quiz: [
      {
        question: 'Folklore says earwigs crawl into human ears — what is actually true?',
        options: [
          'It really happens — earwigs often crawl into the ear canal while people sleep',
          'It is a myth; earwigs have no habit of entering ear canals and pose almost no threat to people',
          'Only a few large earwig species actually do this',
        ],
        answer: 1,
        explain: 'This is a long-standing myth. Earwigs never enter ear canals; their forceps serve only for defense and prey, posing almost no threat to people.',
      },
      {
        question: "What most sets the shore earwig's short elytra apart from the elytra of common beetles?",
        options: [
          'They too fully cover the whole abdomen, just in a darker color',
          'They cover only the front of the abdomen, leaving the rest of the segments fully exposed',
          'They are not wings at all, but thickened, specialized antennae',
        ],
        answer: 1,
        explain: 'Its forewings are short covers reaching only the front of the abdomen, leaving the rest exposed — separating earwigs from full-elytra beetles.',
      },
    ],
    habitat: {
      title: 'Home in the intertidal rock crevices',
      body: 'It lives under coastal rocks, in driftwood crevices, and damp organic debris, favoring humid spots near the high-tide line for shelter, and turns up after low tide too.',
    },
  },

  'dung-beetle': {
    lesson: [
      {
        title: 'A shovel-shaped clypeus',
        body: "The head's front edge flattens into a semicircular scoop, the clypeus, with a hard, straight rim — used to slice dung and dig into soil, the first tool in its routine.",
        anchor: 'clypeus',
      },
      {
        title: 'Serrated forelegs for digging',
        body: 'Each foreleg shin bears three or four stout teeth, like a toothed hoe. Digging soil or turning dung relies on this row of teeth, working with the clypeus to gather it fast.',
        anchor: 'foreleg',
      },
      {
        title: 'A head horn built for combat',
        body: 'Males carry an upward-curving head horn (cephalic horn) that females never grow. Rivals lock horns over a prime dung source, and the winner keeps the ball.',
        anchor: 'horn',
      },
      {
        title: 'A dung ball doubles as a nursery',
        body: 'It digs a shaft straight down from the dung pile, hauling chunks to the bottom and rolling them into a ball. The female lays an egg at its center — nursery and food in one.',
      },
    ],
    motion: {
      title: 'Digging and burying dung on the spot',
      body: "The famous 'rolling ball' belongs to a different group. This beetle tunnels: it lands on fresh dung and digs straight down, dragging chunks to the bottom with toothed forelegs.",
    },
    quiz: [
      {
        question: 'Why does this dung beetle drag dung down into its underground burrow?',
        options: [
          'Purely to clean up the environment, with no other purpose',
          'Mainly to lay eggs and raise young, storing it as food for the larvae',
          'As a display behavior between males competing for mates',
        ],
        answer: 1,
        explain: 'Burying dung and rolling it into a ball lets her lay an egg at its center as a food reserve; the larva feeds on the ball, both nursery and food.',
      },
      {
        question: 'What role does this dung beetle mainly play in a grassland ecosystem?',
        options: [
          'A consumer competing with plants for nutrients',
          'A decomposer that speeds up dung breakdown and returns nutrients to the soil',
          'A pollinator that mainly spreads plant pollen',
        ],
        answer: 1,
        explain: 'By feeding on and burying dung, it speeds decomposition and returns nutrients to the soil faster — a key decomposer in grasslands and pastures.',
      },
    ],
    habitat: {
      title: 'Pastures and dung piles',
      body: 'It is common in pastures and forest-edge grassland with plenty of herbivore dung, tracking a fresh source tens of meters away by smell. Soft, moist soil for digging matters too.',
    },
  },

  weevil: {
    lesson: [
      {
        title: 'A long, slender snout',
        body: 'The snout, or rostrum, is long, slender, and straight, reaching up to a third of body length. Only its tip holds true chewing mouthparts, gnawing into the shoot.',
        anchor: 'rostrum',
      },
      {
        title: 'Antennae mounted on the snout',
        body: "Most insects carry antennae on the head, but this weevil's elbowed antennae sprout from the snout's middle — the clearest mark separating weevils from other beetles.",
        anchor: 'antenna',
      },
      {
        title: 'A vast weevil family',
        body: 'The weevil family is the most species-rich family in the entire animal kingdom, with tens of thousands of recorded species. This weevil specializes in feeding on bamboo shoots.',
      },
      {
        title: 'Larvae bore into shoots and cause damage',
        body: "The female lays eggs in the shoot's husk, and hatched larvae follow her gnawed channel deep into the flesh — by harvest, the inside is often already hollow.",
      },
    ],
    motion: {
      title: 'Drilling the husk to lay an egg',
      body: 'The female drives her slender snout in like a drill, twisting to bore through the husk into the flesh. Once deep enough, she inserts her ovipositor and lays a single egg.',
    },
    quiz: [
      {
        question: "Compared with common insects, what is most unusual about this weevil's antennae?",
        options: [
          'They sprout from the middle of its slender snout, not the top of the head',
          'They are completely reduced and almost invisible',
          'They are several times longer than the entire body',
        ],
        answer: 0,
        explain: "Most insects carry antennae on the head, but this weevil's grow from the snout's middle instead — the clearest trait setting weevils apart.",
      },
      {
        question: 'What is the standing of the weevil family, to which the bamboo weevil belongs, within the entire animal kingdom?',
        options: [
          'It is the largest-bodied family within the insect class',
          'It is the single most species-rich family in the entire animal kingdom',
          'It is a small family with very few known species',
        ],
        answer: 1,
        explain: 'The weevil family outnumbers every other family in the animal kingdom, tens of thousands of species recorded; this one damages bamboo shoots.',
      },
    ],
    habitat: {
      title: 'A shoot-season visitor in bamboo groves',
      body: 'Adults are active when new shoots emerge, feeding around tender shoots and treetops. Larvae live entirely inside one shoot, trapped as it hardens or chewing out early.',
    },
  },

  'click-beetle': {
    lesson: [
      {
        title: 'Two sharp spines at the rear corners',
        body: "The pronotum's rear corners extend into sharp spines, and paired with a slender, boat-like body, this gives it a silhouette unlike the plump build of most resting beetles.",
        anchor: 'pronotum',
      },
      {
        title: 'Jumping without using its legs',
        body: "A spine on the underside snaps suddenly into a groove on the middle segment, and the released force flips the body into the air — the same 'click' that rights it when flipped.",
        anchor: 'clickSpine',
      },
      {
        title: 'Antennae tucked flush against the body',
        body: 'Saw-toothed antennae fold flat into grooves beneath the pronotum, almost invisible, extending only slightly while crawling or sampling scent — cutting drag while moving.',
        anchor: 'antenna',
      },
      {
        title: 'The larva is called a wireworm',
        body: 'The larva is slender, hard-bodied, and golden, commonly called a wireworm. It lurks in soil year-round gnawing crop seeds and roots, a persistent underground pest.',
      },
    ],
    motion: {
      title: 'A leap after being flipped on its back',
      body: 'Flipped onto its back, it raises its head and thorax slightly, lining up its underside spine with the middle-segment groove, then contracts sharply so the spine snaps it upright.',
    },
    quiz: [
      {
        question: 'What mainly allows a click beetle to right itself when flipped onto its back?',
        options: [
          'Pushing hard against the ground with all six legs',
          'The mechanical force released when the underside spine snaps into the groove',
          'Reaction force from rapidly vibrating its wing covers',
        ],
        answer: 1,
        explain: 'A click beetle rights itself through force released as its spine snaps into the mid-segment groove; the legs contribute almost nothing.',
      },
      {
        question: "What is the click beetle's larva commonly called, and what are its habits?",
        options: [
          'A grub, feeding on decaying organic matter',
          'A wireworm, lurking in soil and feeding on seeds and young roots',
          'A wriggler, living in water',
        ],
        answer: 1,
        explain: 'The larva is slender, hard, and golden, called a wireworm. It lurks in soil year-round gnawing crop seeds and roots, a common underground pest.',
      },
    ],
    habitat: {
      title: 'In grass and around crop roots',
      body: 'Adults roam at night among low vegetation at grassland and farmland edges, hiding by day under leaf litter or weeds. Larvae live year-round in soil near crop roots.',
    },
  },

  'diving-beetle': {
    lesson: [
      {
        title: 'A streamlined body built for water',
        body: 'The smooth, egg-shaped body carries no spines or bumps along its elytra edges, so its whole outline stays streamlined, creating almost no extra drag while swimming.',
        anchor: 'body',
      },
      {
        title: 'Hindlegs shaped like oars',
        body: 'The hindlegs are strongly flattened and fringed with stiff hairs, sweeping like oars to push the body forward. The fore- and midlegs grip; only the hindlegs swim.',
        anchor: 'hindleg',
      },
      {
        title: 'Tracheae instead of gills',
        body: 'This beetle breathes through internal air tubes (tracheae), not gills. Before diving it pokes its abdomen tip above the surface and traps an air bubble under its elytra.',
        anchor: 'airStore',
      },
      {
        title: 'The larva is a fierce hunter too',
        body: "Both adult and larva hunt fiercely underwater. The larva's sickle-shaped jaws (mandibles) are hollow like a syringe, injecting digestive fluid before sucking the prey dry.",
      },
    ],
    motion: {
      title: "Refilling air at the abdomen's tip",
      body: 'At the surface it pokes its abdomen tip out first; the folded elytra edge lifts slightly, letting fresh air flow into the space beneath. Refilled, it dives back to keep hunting.',
    },
    quiz: [
      {
        question: 'Living in water for its whole life, how does this diving beetle breathe?',
        options: [
          'With gills, drawing dissolved oxygen straight from the water',
          'With tracheae, drawing oxygen from an air bubble it carries along',
          'By absorbing oxygen from the water directly through its skin',
        ],
        answer: 1,
        explain: 'This beetle breathes through tracheae, not gills. Before diving it traps an air bubble between elytra and abdomen, sustaining it underwater.',
      },
      {
        question: 'What role do the hindlegs play when this diving beetle swims?',
        options: [
          'Mainly gripping prey, just like the fore- and midlegs',
          'Flattened like oars and fringed with swimming hairs, providing the main swimming power',
          'Folded beneath the elytra, taking almost no part in swimming',
        ],
        answer: 1,
        explain: 'The hindlegs are flattened like oars and fringed with swimming hairs, sweeping symmetrically — the only leg pair dedicated to swimming thrust.',
      },
    ],
    habitat: {
      title: 'A hunter in still ponds',
      body: 'It lives in ponds, paddies, and ditches thick with plants and slow currents, where adults and larvae ambush tadpoles, fish, and insects. Clean, oxygen-rich water suits it best.',
    },
  },

  'rove-beetle': {
    lesson: [
      {
        title: 'Wing covers cut drastically short',
        body: "The elytra reach only a short way past the thorax, far less than half the body length, leaving the folded hindwings and most of the abdomen exposed — the source of its family's name.",
        anchor: 'elytra',
      },
      {
        title: 'The abdomen can arch upward',
        body: "The exposed abdomen, distinctly segmented and flexible, arches up over the back like a scorpion's tail when disturbed. It is only a bluff — no real sting sits at the tip.",
        anchor: 'abdomen',
      },
      {
        title: 'The real harm comes from elsewhere',
        body: 'Its small jaws (mandibles) can crush prey, but the harm to people has nothing to do with them. Its body fluid holds a toxin called pederin, released only when crushed against skin.',
        anchor: 'mandible',
      },
      {
        title: 'Actually a guardian of the rice paddy',
        body: 'The red-and-black pattern is only a warning color; it actually feeds on planthoppers and other pests. It never attacks people, quietly keeping paddy pest numbers down.',
      },
    ],
    motion: {
      title: 'Arching its tail up when startled',
      body: "Touched or disturbed, it freezes, then arches its bare abdomen tip high over its back in a scorpion-like warning pose. If bothered further, it scurries off — never biting or stinging.",
    },
    quiz: [
      {
        question: 'If a rove beetle accidentally lands on your skin, what is the correct way to handle it?',
        options: [
          'Slap it dead right away to avoid being bitten',
          'Gently blow it off or shake it away, avoiding crushing it against the skin',
          'Press down firmly to squash it, then rinse the skin',
        ],
        answer: 1,
        explain: 'This beetle does not bite; dermatitis comes from pederin in its fluid touching skin. Slapping it releases the toxin — blow or shake it off instead.',
      },
      {
        question: "Although its dermatitis makes people wary, what is this rove beetle's actual ecological role?",
        options: [
          'A predator that preys on planthoppers and other pests',
          'A disease-spreading pest of public health concern',
          'A plant-feeding pest that eats rice leaves',
        ],
        answer: 0,
        explain: 'The harm here is only skin-contact dermatitis; it is itself predatory, feeding on planthoppers and pests — genuinely beneficial to rice growers.',
      },
    ],
    habitat: {
      title: 'A night wanderer of paddies and banks',
      body: 'It lives in the damp grass and mud along paddies and ditches, drawn indoors by lights at night. By day it hides under fallen leaves, preying on aphids and planthoppers.',
    },
  },

  'flower-chafer': {
    lesson: [
      {
        title: 'Flat, not domed',
        body: 'The elytra lie almost flat, the opposite of the high-domed back of a rhinoceros beetle. Scattered white spots over a bronze-green base catch the eye first in the field.',
        anchor: 'elytra',
      },
      {
        title: 'A notch left along the side edge',
        body: 'Each elytron carries a notch near the shoulder, letting the hindwing extend straight out to beat without fully lifting the elytra — making takeoff far quicker.',
        anchor: 'notch',
      },
      {
        title: 'A snugly fitted pronotum',
        body: 'The plate behind the head (pronotum) is broad and slightly domed, its edges fitting snugly against the elytra. Together they form an almost seamless armor at rest.',
        anchor: 'pronotum',
      },
      {
        title: 'Grubs below, ripe-fruit diners above',
        body: 'The larva is a common grub, curled in humus feeding on decaying plant matter. Adults gather at sap-oozing wounds and overripe fallen fruit, sipping sugar-rich fluid.',
      },
    ],
    motion: {
      title: 'Taking off without lifting its wing covers',
      body: "Before takeoff it skips the full elytra-lifting most chafers need — hindwings extend straight through notches on the elytra's edges and beat while the elytra barely move.",
    },
    quiz: [
      {
        question: "How does this flower chafer's takeoff differ from that of most chafers?",
        options: [
          'It skips lifting its elytra — the hindwings extend through notches on their side edges to take off',
          'It needs a running start over some distance before taking off',
          'It must shed its elytra entirely before it can fly',
        ],
        answer: 0,
        explain: "This chafer has a notch near the shoulder on each elytron, letting the hindwing extend through it to beat without lifting the elytra first.",
      },
      {
        question: "How does this flower chafer's body shape clearly differ from a rhinoceros beetle's?",
        options: [
          'It also has a high-domed back',
          'Its body is flat, with no domed back at all',
          'It has no elytra whatsoever',
        ],
        answer: 1,
        explain: 'Its flat body contrasts with the high-domed back of a rhinoceros beetle; the white spots on its bronze-green elytra are another field mark.',
      },
    ],
    habitat: {
      title: 'Between tree sap and humus soil',
      body: 'Adults gather at sap-oozing tree wounds in broadleaf forests and orchards, and around fallen fruit, feeding on sugary fluid. Grub larvae feed on decay in humus and compost.',
    },
  },
  'burying-beetle': {
    lesson: [
      {
        title: 'Truncated elytra',
        body: 'The wing covers (elytra) are shorter than the abdomen, cut off flat and leaving segments exposed; two wavy orange-red bands cross the black elytra, the clearest field mark for this beetle.',
        anchor: 'elytra',
      },
      {
        title: 'Club-tipped antennae for scent',
        body: 'Each antenna ends in a swollen, club-shaped tip packed with scent receptors, letting the beetle detect a decaying carcass from far away and home in on the rising scent trail.',
        anchor: 'antenna',
      },
      {
        title: 'Burying a carcass together',
        body: 'A pair works together, using their jaws (mandibles) to clear soil around a small carcass and drag it downward until it is fully buried and shaped into a round brood chamber.',
        anchor: 'mandible',
      },
      {
        title: 'Regurgitating food for larvae',
        body: 'Hatched larvae gather around the carcass ball begging for food, and the parents regurgitate pre-digested meals to feed them directly — sustained parental care rare among insects.',
      },
    ],
    motion: {
      title: 'The full burial, worked as a pair',
      body: 'A pair clears debris around a carcass, loosens the soil beneath it, then pushes with their bodies to work it down into a sinking pit; in under a night the body is buried and shaped into a round brood chamber.',
    },
    quiz: [
      {
        question: "What is the burying beetle's most distinctive behavior, and is it common among insects?",
        options: [
          'Parents bury a carcass together and regurgitate food for the larvae, which is rare among insects',
          'Mobbing predators in groups, a common social behavior',
          'Laying eggs in water, as common in most beetles',
        ],
        answer: 0,
        explain: 'A pair buries a carcass to build a brood ball and regurgitates food for the larvae — sustained parental care that is quite rare among insects.',
      },
      {
        question: "What is the main function of the club-shaped tips on a burying beetle's antennae?",
        options: [
          'Storing reserve nutrients',
          'Densely packed with scent receptors, used to detect carcass odor from afar',
          'Sensing sound vibrations to locate a mate',
        ],
        answer: 1,
        explain: 'The club-shaped tips are packed with scent receptors that detect a carcass from far away, the main sense organ for finding food and nesting sites.',
      },
    ],
    habitat: {
      title: 'Scavenger of the forest litter layer',
      body: 'Common in the leaf litter and soft soil of woodlands and thickets, it uses smell to find small carcasses of birds or rodents, then buries them in place to breed — speeding decomposition as a forest scavenger.',
    },
  },

  'tortoise-beetle': {
    lesson: [
      {
        title: 'A skirt of clear armor',
        body: 'The wing covers (elytra) and thorax shield (pronotum) flare into a nearly transparent rim, tucking the head and legs underneath; from above the beetle looks capped by a tiny glass dome.',
        anchor: 'margin',
      },
      {
        title: 'Head hidden beneath the dome',
        body: 'The head retracts under the flared rim and is nearly invisible from above, only showing from the side; this leaves predators no obvious edge to bite into.',
        anchor: 'head',
      },
      {
        title: 'A metallic sheen at the center',
        body: 'The domed center of the elytra keeps a strong metallic sheen, glinting gold-green in sunlight, in sharp contrast to the matte, translucent rim — like a border of frosted glass.',
        anchor: 'elytra',
      },
      {
        title: 'A larva carries a dung parasol',
        body: 'The larva piles its shed skins and droppings onto its back, building a "dung parasol" held above itself for cover, and waves it at approaching predators to drive them off.',
      },
    ],
    motion: {
      title: 'A larva wields its dung parasol',
      body: 'After molting, the larva keeps its old skin, piling it with its own droppings onto forked spines on its back into a layered "dung parasol"; when a predator nears, it swings its body to wave the parasol and drive the attacker away.',
    },
    quiz: [
      {
        question: "What is the transparent rim formed by the tortoise beetle's flared elytra and pronotum for?",
        options: [
          'Pure decoration, with no real function',
          'Concealing the head and all six legs for camouflage',
          'Gliding through the air to extend flight range',
        ],
        answer: 1,
        explain: "The rim hides the head and legs completely, blurring the insect's outline from above — it plays no role in gliding and is not merely decorative.",
      },
      {
        question: 'What material makes up the "dung parasol" on a tortoise beetle larva\'s back?',
        options: [
          'Plant debris glued together with silk',
          'Its own shed skins and droppings',
          'Fragments bitten off leaves',
        ],
        answer: 1,
        explain: 'The larva piles its shed skins and droppings on its back spines into a parasol shape, shielding itself and driving off predators when waved at them.',
      },
    ],
    habitat: {
      title: 'A camouflaged resident of sweet potato leaves',
      body: 'Adults and larvae live year-round on sweet potato and other morning glory leaves, feeding on leaf tissue and leaving translucent scars; its flat, near-transparent body blends almost into the leaf veins.',
    },
  },

  'hercules-beetle': {
    lesson: [
      {
        title: 'How the pincer subdues rivals',
        body: "The long thoracic horn and shorter head horn close like a pincer, lifting a rival's whole body and hurling it off the trunk; hairs on the thoracic horn's inner edge keep the grip from slipping.",
        anchor: 'thoracicHorn',
      },
      {
        title: 'How the head horn assists',
        body: "The head horn (cephalic horn), much shorter than the thoracic horn, braces the rival's underside from below in combat, working with it as a single pivot point for the lifting grip.",
        anchor: 'headHorn',
      },
      {
        title: 'Why the elytra change color',
        body: 'The elytra shift from yellow-green when dry to dark brown or nearly black when damp, because the porous wing covers let the black body wall beneath show through once wet.',
        anchor: 'elytra',
      },
      {
        title: "The world's longest beetle",
        body: 'Including both horns, males reach about 17 centimeters, the longest known beetle body length, native to Central and South American rainforests — though it is lighter than many stockier rhinoceros beetles.',
      },
    ],
    motion: {
      title: 'A contest of pincer and flip',
      body: "Two males press their head horns together to probe for an opening; once one finds a chance, it closes both horns to lift the rival and fling it off the trunk, the thoracic horn's inner hairs keeping a firm grip.",
    },
    quiz: [
      {
        question: 'When male Hercules beetles fight, what is the main role of the thoracic horn and head horn?',
        options: [
          "Stabbing through a rival's elytra like a dagger",
          'Closing together like a pincer to lift a rival and throw it off the trunk',
          'Rubbing together to make sound and scare off a rival',
        ],
        answer: 1,
        explain: "The two horns work together like a pincer, lifting a rival's whole body and hurling it off the trunk through leverage, not by piercing the elytra.",
      },
      {
        question: "What causes the Hercules beetle's elytra to change color?",
        options: [
          'Ambient humidity — the color darkens after absorbing water',
          'Day-night temperature swings — lighter by day, darker by night',
          'How much it eats — the more it eats, the brighter the color',
        ],
        answer: 0,
        explain: 'The porous elytra let the black body wall show through once damp, darkening the color, then fade to yellow-green when dry — not temperature or diet.',
      },
    ],
    habitat: {
      title: 'A solitary dweller of the rainforest canopy',
      body: 'Adults stay in the rainforest canopy near oozing sap or fallen fruit, active by night; larvae burrow in humus or rotting wood for over a year, a life barely overlapping the adults.',
    },
  },

  'whirligig-beetle': {
    lesson: [
      {
        title: 'Compound eyes split in two',
        body: 'The compound eyes divide fully into upper and lower pairs at the waterline, the upper watching the air and the lower the water below, tracking danger and prey on both sides at once.',
        anchor: 'upperEye',
      },
      {
        title: 'A second pair of eyes underwater',
        body: 'The lower compound eyes look down into the water, spotting small fish or predators below the surface; they form images independently of the upper pair, seeing two worlds at once.',
        anchor: 'lowerEye',
      },
      {
        title: 'Midlegs turned into fast paddles',
        body: "The midlegs and hindlegs are short, flat paddles fringed with stiff hairs, stroking at very high frequency; unlike a diving beetle's slender legs, these suit rapid spinning, not deep pursuit.",
        anchor: 'midleg',
      },
      {
        title: 'Sensing ripples to navigate',
        body: 'As it swims it stirs rings of tiny ripples, and receptors at the base of its antennae read ripples reflected off obstacles or prey, acting like a sonar that prevents collisions while spinning.',
        anchor: 'antenna',
      },
    ],
    motion: {
      title: 'Sonar for spinning on the surface',
      body: 'Groups spin rapidly on calm water, looking chaotic yet rarely colliding: the legs paddle like fast oars while antennal receptors read reflected ripples in real time to dodge neighbors and obstacles.',
    },
    quiz: [
      {
        question: "The whirligig beetle's compound eyes split into upper and lower pairs — what is this for?",
        options: [
          'The upper and lower pairs handle daytime and nighttime vision separately',
          'Monitoring activity above the water and below it at the same time',
          'One pair is for seeing, the other only regulates body temperature',
        ],
        answer: 1,
        explain: 'The eyes split at the waterline, the upper pair watching the air and the lower the water, letting it track both sides at once while resting there.',
      },
      {
        question: 'How does the whirligig beetle avoid collisions while spinning in a crowd?',
        options: [
          'By agreeing on individual routes in advance',
          'Sensing ripples reflected off obstacles and neighbors with its antennae',
          'Fixing its upper compound eyes on every neighbor at once',
        ],
        answer: 1,
        explain: 'It stirs tiny ripples while swimming, and antennal receptors read signals reflected off neighbors, adjusting course in real time — a surface sonar.',
      },
    ],
    habitat: {
      title: 'A community on still water',
      body: 'Found in groups on the still surfaces of ponds and ditches, most active by day, moving on if the water grows choppy or polluted; tiny but numerous, they are common prey for fish and waterbirds.',
    },
  },

  'ground-beetle': {
    lesson: [
      {
        title: 'Engraved ridges on the elytra',
        body: 'The wing covers (elytra) bear raised longitudinal ridges with rows of tiny pits between them, as if finely engraved — the clearest field mark for identifying ground beetles.',
        anchor: 'elytra',
      },
      {
        title: 'Why it cannot fly',
        body: 'In most large ground beetles the hindwings have degenerated and the elytra are fused along the midline, so they cannot fly; long, powerful legs let them run fast instead.',
        anchor: 'leg',
      },
      {
        title: 'How the mandibles subdue prey',
        body: "The sickle-shaped jaws (mandibles) grip a snail's shell opening or a caterpillar's body, biting straight through shell or skin; both adults and larvae hunt actively this way.",
        anchor: 'mandible',
      },
      {
        title: 'How antennae locate prey',
        body: "Active mostly at night, this beetle relies on its long, thread-like antennae for scent and ground vibration as much as sight, following a snail's slime trail to hidden prey.",
        anchor: 'antenna',
      },
    ],
    motion: {
      title: 'A fast sprint to ambush a snail',
      body: "On spotting prey, the beetle closes the gap quickly on its long legs, and before a snail can withdraw, its sickle-shaped mandibles grip the soft head and foot, dragging the catch off to feed.",
    },
    quiz: [
      {
        question: 'Why can most large ground beetles, including this species, not fly?',
        options: [
          'Their wings are tangled in hairs on the elytra and cannot unfold',
          'The hindwings have degenerated and the elytra are fused along the midline, leaving them naturally flightless',
          'Their bodies are too heavy for their flight muscles to lift',
        ],
        answer: 1,
        explain: 'Their hindwings have degenerated and the elytra are fused along the midline, so they lose flight and rely on strong legs for fast running instead.',
      },
      {
        question: 'How does this ground beetle mainly deal with prey like snails and caterpillars?',
        options: [
          'Secreting digestive fluid to dissolve prey externally before feeding',
          "Gripping and biting the prey's body or shell opening with its sickle-shaped mandibles",
          'Spinning a web to entangle prey before feeding slowly',
        ],
        answer: 1,
        explain: "Its sickle-shaped mandibles bite directly into a prey's shell opening or body; both adults and larvae are active predators, not web-spinners.",
      },
    ],
    habitat: {
      title: 'A night wanderer beneath the leaf litter',
      body: 'By day it hides under damp leaf litter, stones, or soil cracks in farmland and forest edges, emerging at night to hunt; snail- and caterpillar-rich fields are its favorite hunting ground.',
    },
  },

  'blister-beetle': {
    lesson: [
      {
        title: 'A broad head on a narrow neck',
        body: 'The head is distinctly wider than the thorax shield (pronotum), narrowing into a thin neck between them, while the pronotum itself is long and slender — a clear field mark for this family.',
        anchor: 'head',
      },
      {
        title: 'Why the elytra sag soft',
        body: 'The wing covers (elytra) stay soft and never harden, and their tips fail to close fully over the abdomen, unlike the hard, tightly closed elytra of most beetles.',
        anchor: 'elytra',
      },
      {
        title: 'Toxic yellow fluid as defense',
        body: 'When disturbed, this beetle oozes a drop of yellow fluid from its leg joints — reflex bleeding; the fluid contains cantharidin, which blisters skin on contact, the source of its English name.',
        anchor: 'leg',
      },
      {
        title: 'A larva that changes shape repeatedly',
        body: 'The larva passes through several sharply different stages (hypermetamorphosis): an active first instar roams for grasshopper eggs, then molts into a bloated, immobile feeding form.',
      },
    ],
    motion: {
      title: 'Reflex bleeding when startled',
      body: 'When startled, fluid pressure in the leg joints spikes, forcing a drop of yellow liquid out — reflex bleeding; the cantharidin in it causes redness and blisters, its most effective defense.',
    },
    quiz: [
      {
        question: "What is this blister beetle's typical defensive response when disturbed?",
        options: [
          "Biting hard into the attacker's skin with its mandibles",
          'Oozing cantharidin-laced yellow fluid from its leg joints',
          'Spraying acidic gas from the tip of its abdomen',
        ],
        answer: 1,
        explain: 'It oozes cantharidin-laced yellow fluid from its leg joints, a reflex-bleeding response that blisters skin on contact, not by biting or spraying acid.',
      },
      {
        question: "What is distinctive about how this beetle's larva changes shape as it develops?",
        options: [
          'Each instar looks almost the same, just growing larger',
          'It goes through hypermetamorphosis, with strikingly different forms and habits at each instar',
          'The larval stage does not feed at all, living off yolk reserves',
        ],
        answer: 1,
        explain: 'It goes through hypermetamorphosis: an active first instar seeks grasshopper eggs, then molts into a bloated, immobile feeding form — a sharp shift.',
      },
    ],
    habitat: {
      title: 'A seasonal visitor to farmland and grassland',
      body: 'Common in farmland, wasteland, and roadside grass, adults gather on legume flowers and leaves and can swarm to strip foliage; its toxic fluid can blister skin, so avoid crushing swarms by hand.',
    },
  },

  'hister-beetle': {
    lesson: [
      {
        title: 'Squared-off, truncated elytra',
        body: 'The body is compact and almost square, glossy as if lacquered; the wing covers (elytra) are truncated, leaving the last abdominal segment exposed — unlike most round, plump beetles.',
        anchor: 'elytra',
      },
      {
        title: 'Tucking everything away to play dead',
        body: 'When disturbed, this beetle withdraws its legs and antennae into grooves on its underside, folding into a compact black block that barely looks alive — leaving predators no gap to bite.',
        anchor: 'tuckedLeg',
      },
      {
        title: 'Its prey is maggots, not the carcass',
        body: 'Though a constant presence around carcasses and dung, it has no interest in the rotting matter itself — its real prey is the fly larvae (maggots) gathered there, making it a predator, not a scavenger.',
        anchor: 'head',
      },
      {
        title: 'A regular clue in forensic cases',
        body: 'Because it appears in a fairly predictable sequence across decomposition stages, this beetle is a key reference for forensic entomology, helping estimate time since death.',
      },
    ],
    motion: {
      title: 'Playing dead by tucking everything in',
      body: 'When threatened, this beetle draws its legs and antennae into grooves on its underside, folding into a smooth, hard block; predators that cannot bite through the elytra usually give up and move on.',
    },
    quiz: [
      {
        question: 'This beetle is common around carcasses and dung — what is its actual food?',
        options: [
          'The decomposing carcass tissue itself',
          'Fly larvae (maggots) gathered in the carcass or dung',
          'Undigested plant fiber in the dung',
        ],
        answer: 1,
        explain: 'It has no interest in rotting flesh or dung itself; its real prey is the fly larvae gathered there, making it a predator rather than a scavenger.',
      },
      {
        question: "What is this beetle's typical reaction when disturbed?",
        options: [
          'Spreading its wings and flying off immediately',
          'Tucking its legs and antennae into grooves on its underside, playing dead as a compact block',
          'Spraying irritating gas from a gap in its elytra',
        ],
        answer: 1,
        explain: 'It withdraws its legs and antennae into underside grooves, folding into a black block that stays motionless — a death-feigning trick, not flight.',
      },
    ],
    habitat: {
      title: 'A permanent resident of carcasses and dung',
      body: 'Found on animal carcasses, dung piles, and decaying plant matter, using smell to locate these habitats; as decomposition stages change, the beetle species present shift in a predictable order.',
    },
  },

  treehopper: {
    lesson: [
      {
        title: 'The "helmet" is really the thorax',
        body: 'That flamboyant "helmet" is neither head nor wing — it is the thorax shield (pronotum) extended backward and upward; shapes vary widely and often mimic thorns to confuse predators.',
        anchor: 'helmet',
      },
      {
        title: 'How the beak draws sap',
        body: "A slender piercing beak (rostrum) extends from beneath the head, piercing a stem's outer layer to draw sap directly; the treehopper feeds this way for life and cannot chew plant tissue.",
        anchor: 'rostrum',
      },
      {
        title: 'Honeydew in exchange for bodyguards',
        body: 'Most treehoppers excrete sugar-rich honeydew from the abdomen tip, and ants guard the source, chasing off ladybirds and parasitic wasps in return — a mutualism common among insects.',
        anchor: 'abdomen',
      },
      {
        title: 'Quick to bolt when startled',
        body: 'Normally motionless on a twig, relying on camouflage, a treehopper reacts to a real touch or close approach with a sudden hindleg kick that launches it away, then a short burst of flight.',
        anchor: 'hindleg',
      },
    ],
    motion: {
      title: 'Ants come by on schedule to "milk" it',
      body: 'Ants patrol twigs crowded with treehoppers, tapping the abdomen tip with their antennae to prompt honeydew, and the treehopper obliges with a droplet; in return, ants chase off predators all through the nymph stage.',
    },
    quiz: [
      {
        question: "The flamboyant \"helmet\" atop a treehopper's head is actually which part of its body?",
        options: [
          'An enlarged, specialized head',
          'A structure formed by the pronotum extending backward',
          'A pair of forewings folded up and tucked away',
        ],
        answer: 1,
        explain: 'This "helmet" is neither head nor wing but an extreme pronotum extension, mimicking a thorn to confuse predators, and easily mistaken for the head.',
      },
      {
        question: 'What is the common relationship between treehoppers and ants?',
        options: [
          'Ants prey on treehoppers as one of their natural enemies',
          'Treehoppers secrete honeydew to feed ants, and ants help drive off predators in return',
          'The two simply happen to share the same twig, with no real interaction',
        ],
        answer: 1,
        explain: 'Treehoppers secrete honeydew for ants to feed on, while ants stand guard to chase off ladybirds and parasitic wasps — a mutualism, not predation.',
      },
    ],
    habitat: {
      title: 'A disguise artist on tender twigs',
      body: "Found on the tender-barked twigs of shrubs or young trees, its color and helmet shape match the host plant's thorns or buds, blending in almost completely when still.",
    },
  },

  'ichneumon-wasp': {
    lesson: [
      {
        title: 'An exaggeratedly long ovipositor',
        body: "A female's egg-laying tube (ovipositor) reaches several times her body length, hair-thin yet tough, built from a central egg tube flanked by two sheaths — flexible enough to bend into a trunk.",
        anchor: 'ovipositor',
      },
      {
        title: 'How antennae "listen" for echoes',
        body: 'A female taps the bark surface with her antennae tips, judging from the returning vibrations whether tunnels and larvae lie within, pinpointing a host without ever seeing inside.',
        anchor: 'antenna',
      },
      {
        title: 'A slender waist braces the long tube',
        body: 'The narrow waist between thorax and abdomen bends through a wide arc, letting the body arch upright to aim the long ovipositor precisely — without it she could not control a tube several times her size.',
        anchor: 'waist',
      },
      {
        title: 'It does not actually sting',
        body: 'The wasp\'s striking long filament is often mistaken for a giant sting, but it is really an ovipositor for laying eggs deep inside a host in a tree trunk; the wasp cannot sting at all.',
      },
    ],
    motion: {
      title: 'Drilling through wood to lay eggs',
      body: 'Once she pinpoints a host, a female presses her ovipositor against the bark, rotating slightly and pressing with her body weight to work it through several centimeters of wood, then slides an egg onto the host larva.',
    },
    quiz: [
      {
        question: "The ichneumon wasp's long \"filament\" is often mistaken for a giant sting — what is it actually?",
        options: [
          'An extended sting used to attack predators',
          'An ovipositor used to lay eggs deep inside a host in a tree trunk',
          'Extended antennae for sensing scent and vibration',
        ],
        answer: 1,
        explain: 'This filament is an ovipositor, a central egg tube with two sheaths, used to lay eggs deep inside a host in a tree trunk; the wasp has no sting.',
      },
      {
        question: 'How does the ichneumon wasp find a host hidden inside a tree trunk?',
        options: [
          'Tapping the bark with her antennae and reading the returning vibrations',
          'Probing the entire trunk repeatedly with the ovipositor alone',
          'Seeing through the bark with her compound eyes',
        ],
        answer: 0,
        explain: 'A female taps the bark with her antennae, reading the vibrations to judge whether tunnels and larvae lie within — locating a host without seeing it.',
      },
    ],
    habitat: {
      title: 'A host reservoir inside old tree trunks',
      body: 'Found around aging broadleaf trunks harboring wood-boring larvae, a female scans the bark for vibration signals to fix her egg-laying spot; the same dead trunk often draws several wasps in turn.',
    },
  },

  dobsonfly: {
    lesson: [
      {
        title: 'What the long mandibles are for',
        body: 'A male grows a slender, sickle-shaped jaw (mandible) on each side of his head, crossing far out at rest; used mainly for display and gripping in mate contests, its actual bite is fairly weak.',
        anchor: 'mandible',
      },
      {
        title: "The female's mandibles do more",
        body: "A female's mandibles are shorter and less dramatic than a male's, yet bite harder; his long pair works more like a showpiece, while her plainer jaws handle real defense or hunting.",
        anchor: 'mandible',
      },
      {
        title: 'The larva as a water-quality sentinel',
        body: 'The larva, called a "sand crawler," lives among streambed stones preying on small aquatic animals, and survives only in clean streams with ample oxygen — its presence signals unpolluted water.',
      },
      {
        title: 'How compound eyes find others',
        body: "The adult's compound eyes are well developed, its main sense for detecting others and mates at night; since adults barely feed and live briefly, eyes and jaws serve courtship, not foraging.",
        anchor: 'eye',
      },
    ],
    motion: {
      title: 'Courtship with interlocked mandibles',
      body: "A courting male hooks his sickle-shaped mandibles around the base of the female's wings or thorax, crossing and entwining but rarely biting hard — misjudging the grip could injure his intended mate.",
    },
    quiz: [
      {
        question: "Which statement about the male dobsonfly's exaggerated long mandibles is correct?",
        options: [
          'They bite with extreme force and are its main hunting weapon',
          'They are mainly used for courtship display and gripping, with a fairly weak actual bite',
          'They exist only in the larval stage and are shed in the adult',
        ],
        answer: 1,
        explain: "A male's long mandibles look fierce but bite fairly weakly, serving mainly for courtship display; the female's short mandibles actually bite harder.",
      },
      {
        question: 'What is the dobsonfly larva, commonly called a "sand crawler," often used to assess?',
        options: [
          'The tree species composition of nearby forest',
          'Whether the stream it lives in is clean and rich in dissolved oxygen',
          'The seasonal temperature range of the local area',
        ],
        answer: 1,
        explain: 'The larva survives only in clean, oxygen-rich streams and is sensitive to pollution, so finding it signals a relatively unpolluted stretch of water.',
      },
    ],
    habitat: {
      title: 'A youth spent among streambed stones',
      body: 'The larva lives among mountain streambed stones, hunting other invertebrates by night and needing fast-flowing, oxygen-rich water; the short-lived adult leaves the water for streamside woodland.',
    },
  },
  'goliath-beetle': {
    lesson: [
      {
        title: 'A Heavyweight Body',
        body: 'Males can reach 11 cm long, and the heaviest individuals top 80 g, making this one of the world’s heaviest insects; the larva (grub) can even outweigh the adult, a true heavyweight of the insect world.',
        anchor: 'elytra',
      },
      {
        title: 'Camouflage in the Pattern',
        body: 'The wing cases (elytra) and back plate (pronotum) are covered in a velvety, mottled pattern like lichen on bark; at rest on a branch it breaks up the body’s outline, making it harder for predators to spot.',
        anchor: 'elytra',
      },
      {
        title: 'A Forked Horn on the Head',
        body: 'Males grow a forked, Y-shaped head horn (cephalic horn), much like related rhinoceros beetles: sap wounds rich in food are scarce, so males lock horns to shove rivals off a feeding spot.',
        anchor: 'headHorn',
      },
      {
        title: 'A Larva’s Hidden Struggle',
        body: 'The larva lives in humus and rotting wood debris, but needs far more protein than most scarab grubs; without enough, growth stalls or the larva dies — notoriously hard to raise in captivity.',
      },
    ],
    motion: {
      title: 'Heavy, Yet It Can Fly',
      body: 'It ranks among the heaviest beetles by weight, but a lateral notch at the shoulder of each elytron lets the membranous hindwing unfurl and beat without lifting the wing case — takeoff is far quicker than its bulk suggests.',
    },
    quiz: [
      {
        question: 'When raising the Goliath beetle’s larva in captivity, where do problems most often arise?',
        options: [
          'Humidity too low, causing the larva to dehydrate',
          'Its protein needs far exceed most scarab grubs, so it stunts easily if underfed',
          'The larva is light-sensitive and must be kept in total darkness',
        ],
        answer: 1,
        explain: 'The larva needs far more protein than most scarab grubs; falling short stalls growth or kills it, making captive breeding notoriously hard.',
      },
      {
        question: 'What does the adult Goliath beetle mainly feed on?',
        options: [
          'It preys on other insects for protein',
          'It laps up tree sap and overripe fruit',
          'It feeds exclusively on plant roots',
        ],
        answer: 1,
        explain: 'The adult laps sugar from sap and fruit rather than preying on insects; only the larva needs high-protein food, so the stages feed very differently.',
      },
    ],
    habitat: {
      title: 'A Rainforest Canopy Camp',
      body: 'Found in equatorial Africa’s rainforests, adults gather at sap wounds on tall trees and fallen fruit, most active as the rainy season warms; an old, sap-oozing trunk at a clearing’s edge is the best sign to watch for.',
    },
  },

  'bombardier-beetle': {
    lesson: [
      {
        title: 'Orange and Black',
        body: 'The head and back plate (pronotum) are orange-red, the wing cases (elytra) dark; slender and fast-running, it’s the best-known chemical-weapons expert among ground beetles, quick to strike when threatened.',
        anchor: 'elytra',
      },
      {
        title: 'Two Reaction Chambers',
        body: 'Hidden at the abdomen’s tip are two small chambers: the outer holds hydrogen peroxide and hydroquinone, the inner lined with catalytic enzymes; sealed apart until a muscle mixes them when threatened.',
        anchor: 'sprayTip',
      },
      {
        title: 'A Nozzle That Can Aim',
        body: 'The spray opening sits on the abdomen’s last segment and can pivot in almost any direction; whichever angle a predator bites from — leg or body — it can swivel the nozzle to fire straight back.',
        anchor: 'sprayTip',
      },
      {
        title: 'A Nighttime Hunter',
        body: 'Most ground beetles (Carabidae) hunt small invertebrates at night, and the bombardier beetle is no exception; its potent chemical weapon means it has little to fear from close-range ambush.',
      },
    ],
    motion: {
      title: 'An Explosive Blast',
      body: 'Stored peroxide and hydroquinone are forced into a reaction chamber where enzymes trigger an instant burst of benzoquinone vapor near 100°C, fired in rapid pulses rather than a steady stream and aimed by a rotating nozzle.',
    },
    quiz: [
      {
        question: 'How can the bombardier beetle fire scalding gas instantly without harming itself?',
        options: [
          'Its body surface is coated in a heat-resistant wax layer',
          'The two chemicals are stored apart and only mixed and catalyzed when attacked',
          'It first secretes mucus to coat its own abdomen before spraying',
        ],
        answer: 1,
        explain: 'The chemicals stay in separate chambers until threatened, when enzymes catalyze an instant reaction between them, so the beetle itself isn’t harmed.',
      },
      {
        question: 'How is the bombardier beetle’s hot gas actually released?',
        options: [
          'As a continuous stream, like water from a hose',
          'In extremely rapid pulses rather than one continuous stream',
          'Only once, using up its entire supply, then it relies on bluffing',
        ],
        answer: 1,
        explain: 'High-speed photography shows hundreds of pulses per second, not one steady stream; the pulsing also keeps scalding gas from lingering inside its body.',
      },
    ],
    habitat: {
      title: 'A Base Beneath Fallen Leaves',
      body: 'By day it hides in damp spots under leaf litter, stones, or rotting wood, emerging at night to forage; after a summer rain, turning over leaf litter or a stone often reveals it dashing off or puffing defensive smoke.',
    },
  },

  'darkling-beetle': {
    lesson: [
      {
        title: 'A Rounded, Domed Shell',
        body: 'Jet black, with a back arched high like an upturned bowl, the wing cases (elytra) often bear fine bumps or ridges — a stout-bodied member of the desert darkling beetle (Tenebrionidae) family.',
        anchor: 'pronotum',
      },
      {
        title: 'Elytra Fused Shut',
        body: 'The two elytra are fused solid along the midline into a single hard shell, and the hindwings beneath have withered away — meaning it can never fly, and must trek slowly across the sand on six legs.',
        anchor: 'fusedElytra',
      },
      {
        title: 'An Air Pocket Under the Shell',
        body: 'Between the fused elytra and its back lies a sealed layer of air, like a close-fitting vest — it buffers the desert’s extreme day–night temperature swings and cuts down on moisture lost to dry air.',
        anchor: 'abdomen',
      },
      {
        title: 'Active by Night, Hidden by Day',
        body: 'Daytime desert surface temperatures run too high, so it stays buried in loose sand or shaded under stones; only at dusk does it emerge to feed on dry plant debris and other organic matter.',
      },
    ],
    motion: {
      title: 'Stilting on Long Legs to Cool Off',
      body: 'At midday, desert sand grows scorching hot, so it props its body high on six slender legs, cutting down direct contact with the burning surface; this stilt-like stance noticeably reduces heat rising from the ground.',
    },
    quiz: [
      {
        question: 'What does it mean that the Gansu darkling beetle’s elytra are completely fused along its back?',
        options: [
          'It has lost the ability to fly for its entire life',
          'Its elytra are actually harder and heavier than wings',
          'It can only fly briefly during the larval stage',
        ],
        answer: 0,
        explain: 'Once the elytra fuse and hindwings shrink, the change is permanent; from adulthood on, this beetle is grounded for life, moving and foraging on foot.',
      },
      {
        question: 'What is the main function of the sealed air layer beneath the Gansu darkling beetle’s elytra?',
        options: [
          'Buffering day–night temperature swings and cutting water loss, a desert adaptation for retaining moisture',
          'Collecting dew condensed from morning fog to drink',
          'Storing air so it can briefly bury itself in sand and breathe',
        ],
        answer: 0,
        explain: 'This air layer buffers temperature swings and cuts water loss — a desert adaptation; fog-harvesting elytra is a different Namib beetle’s trick.',
      },
    ],
    habitat: {
      title: 'Deep in the Gobi Sands',
      body: 'Found in the Gobi desert terrain of Gansu, northwest China, it stays buried by day in shaded dune slopes or beneath sparse scrub; dawn or dusk, when temperatures are mild, is the easiest time to spot it crawling across the sand.',
    },
  },

  'net-winged-beetle': {
    lesson: [
      {
        title: 'Bright Red Elytra',
        body: 'The whole body is usually bright red or orange-red, with flat, soft wing cases (elytra) whose raised longitudinal ridges crisscross into a net-like texture — the source of the net-winged beetle’s name.',
        anchor: 'elytra',
      },
      {
        title: 'Soft, Not Hard Elytra',
        body: 'Unlike most beetles’ rigid wing cases, this species’ elytra are pliable, almost leathery — pinch one gently and feel it flex, a handy trick for telling it apart from fireflies and ladybirds.',
        anchor: 'ridge',
      },
      {
        title: 'Red as a Warning',
        body: 'The vivid red isn’t for show — it’s a clear warning color (aposematism): the body holds chemicals that displease predators, and a bird that pecks one once tends to remember and avoid it from then on.',
        anchor: 'pronotum',
      },
      {
        title: 'It Doesn’t Actually Glow',
        body: 'Net-winged beetles are often confused with fireflies by name or looks, but they can’t glow; true light-producing fireflies belong to family Lampyridae, a different family with different habits.',
      },
    ],
    motion: {
      title: 'A Template for Mimicry',
      body: 'The beetle itself isn’t especially fierce — what’s remarkable is how widely its colors get borrowed: many harmless insects evolve near-identical red-and-black patterns, and predators avoiding the real thing spare the copycats too.',
    },
    quiz: [
      {
        question: 'The net-winged beetle is vivid red all over — what is this coloring mainly for?',
        options: [
          'Helping it hide among flowers',
          'Warning predators it tastes bad and carries defensive chemicals',
          'Courtship display, unrelated to warning predators',
        ],
        answer: 1,
        explain: 'Its red is a classic warning color tied to unpleasant body chemicals; after one bad taste, predators remember and avoid the pattern from then on.',
      },
      {
        question: 'Which of the following statements about the net-winged beetle is correct?',
        options: [
          'Like fireflies, its abdomen glows at night',
          'It doesn’t glow, and harmless insects often mimic its colors to fool predators',
          'It uses glowing signals to find mates at night',
        ],
        answer: 1,
        explain: 'Net-winged beetles cannot glow, though confused with fireflies; their pattern is a warning template many harmless insects mimic for safety.',
      },
    ],
    habitat: {
      title: 'Along Broadleaf Forest Edges',
      body: 'Adults live along broadleaf forest edges, in shrubs, or among flowers, active by day and relying on bold color rather than hiding; larvae lurk under rotting wood and leaf litter, feeding on decay and rarely seen.',
    },
  },

  'leaf-beetle': {
    lesson: [
      {
        title: 'Yellow with Black Stripes',
        body: 'Oval and flattened, base color yellow-green, with bold black stripes down the wing cases (elytra) and a few spots on the back plate (pronotum) — the most common yellow-and-black beetle found on elm leaves.',
        anchor: 'elytra',
      },
      {
        title: 'Antennae Find the Host Tree',
        body: 'Thread-like antennae detect scent molecules given off by elm leaves with great sensitivity; adults follow this scent trail straight to nearby elms and rarely linger to feed on other tree species.',
        anchor: 'antenna',
      },
      {
        title: 'Adults Chew Through Leaves',
        body: 'The adult’s jaws (mandibles) chew powerfully, punching irregular round holes straight through the leaf; in bad outbreaks a whole elm can end up riddled with holes — one of the elm’s chief leaf-feeding pests.',
        anchor: 'head',
      },
      {
        title: 'Larvae Skeletonize the Leaf',
        body: 'Larvae have weaker mouthparts and only scrape soft tissue from the leaf’s underside, leaving netted veins — the eaten leaf turns gauze-thin; mature larvae crawl in groups to the trunk base to pupate.',
      },
    ],
    motion: {
      title: 'A Mass March Down the Trunk',
      body: 'Once mature larvae strip a leaf’s tissue, they don’t pupate on the spot — instead they crawl down the trunk in a group, gathering in bark crevices or loose soil at the base, away from predators in the canopy above.',
    },
    quiz: [
      {
        question: 'How do adult and larval elm leaf beetles differ in the way they feed on elm leaves?',
        options: [
          'Adults chew clean through the leaf, leaving holes; larvae only scrape the underside, leaving netted veins',
          'They feed identically, except larvae simply eat more',
          'Adults only drink sap and never bite leaves; only larvae chew tissue',
        ],
        answer: 0,
        explain: 'Adults punch through the leaf with strong jaws; larvae only scrape the underside, leaving netted veins — easy to tell the two feeding patterns apart.',
      },
      {
        question: 'What does a mature elm leaf beetle larva typically do before pupating?',
        options: [
          'Pupate right where it fed, on the underside of the leaf',
          'Crawl down the trunk in groups and pupate together at the base',
          'Burrow deep into the soil to pupate alone',
        ],
        answer: 1,
        explain: 'After stripping the leaves, mature larvae crawl down the trunk in groups, pupating together in bark crevices or loose soil at the base.',
      },
    ],
    habitat: {
      title: 'Wherever Elms Grow',
      body: 'It turns up wherever elms are planted — street trees, parks, and nursery elms are its main habitat; numbers typically rise as new leaves unfurl in late spring, and turning over a leaf often reveals clustered larvae underneath.',
    },
  },

  damselfly: {
    lesson: [
      {
        title: 'An Abdomen Thin as a Thread',
        body: 'The abdomen is extremely long and thin, almost as slender as a thread — the easiest way to tell it from the stockier dragonfly; perched on a twig, its thin abdomen sways gently in the breeze.',
        anchor: 'abdomen',
      },
      {
        title: 'Wings Folded at Rest',
        body: 'At rest, a damselfly folds all four wings upright together above its back; a perched dragonfly, by contrast, holds both wing pairs spread flat to the sides — the quickest way to tell the two apart in the field.',
        anchor: 'wing',
      },
      {
        title: 'Eyes Set Far Apart',
        body: 'Its two compound eyes sit far apart, with a clear gap between them; a dragonfly’s compound eyes nearly touch atop its head — another reliable head feature for telling the two apart.',
        anchor: 'eye',
      },
      {
        title: 'Gills at the Tail',
        body: 'The nymph lives underwater, breathing through three flat, leaf-like gills at the abdomen’s tip, unlike a dragonfly nymph; the adult is also a weaker flier, rarely hovering or chasing at speed like dragonflies.',
      },
    ],
    motion: {
      title: 'Short Flights Among Reeds',
      body: 'A damselfly’s wings are nearly identical fore and hind, and its flight muscles are weaker than a dragonfly’s, so long cruising is rare; it favors short hovers among water plants, striking at midges from close range.',
    },
    quiz: [
      {
        question: 'When perched and not flying, how do a damselfly’s and a dragonfly’s wing postures clearly differ?',
        options: [
          'Damselflies fold all four wings upright; dragonflies spread both pairs flat to the sides',
          'Their resting postures are identical and cannot be distinguished',
          'Damselflies retract their wings entirely into the body',
        ],
        answer: 0,
        explain: 'A perched damselfly folds its wings upright; a dragonfly spreads both pairs flat to the sides — the quickest field way to tell the two apart.',
      },
      {
        question: 'Judging only by how the compound eyes are arranged, how can you tell a damselfly from a dragonfly?',
        options: [
          'A damselfly’s eyes sit far apart; a dragonfly’s nearly touch',
          'A damselfly has only one compound eye; a dragonfly has two',
          'Their eyes are positioned identically, at the same distance apart',
        ],
        answer: 0,
        explain: 'A damselfly’s eyes sit far apart with a clear gap; a dragonfly’s nearly meet atop the head — a reliable way to tell the two apart.',
      },
    ],
    habitat: {
      title: 'Grassy Margins by Water',
      body: 'It lives among water plants at the edges of ponds, streams, and marshes, flying low or perching on grass stems to bask; clear summer mornings are the easiest time to spot it resting, waiting for dew on its wings to dry.',
    },
  },

  'orchid-mantis': {
    lesson: [
      {
        title: 'Pink and White Like Petals',
        body: 'The body is mainly pink and white, with four flattened leg segments whose rounded, translucent edges look, at a glance, almost identical to orchid petals — one of the finest mimics in the insect world.',
        anchor: 'abdomen',
      },
      {
        title: 'Leg Segments Become Petals',
        body: 'The femurs of the mid and hind legs flatten and expand sideways, edges curving into rounded outlines that look, from a distance, like four unfurled petals — a disguise absent from the front legs.',
        anchor: 'petalLeg',
      },
      {
        title: 'Front Legs Still Hunt',
        body: 'Only the mid and hind legs wear the petal disguise; the front pair keeps the mantis’s grasping shape (raptorial forelegs), lined with sharp spines, waiting to seize any prey within reach.',
        anchor: 'raptorialLeg',
      },
      {
        title: 'Nymphs Look Even Brighter',
        body: 'A newly hatched nymph is often even more vividly colored than the adult, and its shade gradually shifts with each molt so its color keeps matching the flowers it lives on — the disguise is not fixed for life.',
      },
    ],
    motion: {
      title: 'Luring Pollinators In',
      body: 'Most mimics hide from predators; the orchid mantis does the opposite — it stands on a branch as a fake flower itself, drawing bees and butterflies in. Studies find it attracts pollinators even more than the real flowers nearby.',
    },
    quiz: [
      {
        question: 'Which part of the orchid mantis’s body is disguised as petals?',
        options: [
          'All three pairs of legs are shaped like petals',
          'The femurs of the mid and hind legs; the front legs remain raptorial',
          'Only the wing edges mimic petal shapes',
        ],
        answer: 1,
        explain: 'The disguise is limited to the mid and hind leg femurs, flattened into petals; the front legs stay true raptorial forelegs, ready to strike.',
      },
      {
        question: 'Which statement about the orchid mantis’s mimicry is correct?',
        options: [
          'It hides behind real flowers, ambushing bees and butterflies as they feed',
          'It mimics a flower itself and actively lures pollinators closer; experiments show it can outdraw real flowers',
          'It mimics floral scent, attracting prey by smell rather than shape',
        ],
        answer: 1,
        explain: 'It doesn’t hide within flowers — its body itself is a fake flower that draws pollinators closer; measurements show it can outdraw real blooms.',
      },
    ],
    habitat: {
      title: 'Among Tropical Rainforest Blooms',
      body: 'Native to Southeast Asian rainforests, it perches among flower clusters on blooming shrubs or vines, waiting motionless as bees and butterflies wander close; spotting one means finding the one flower that never moves.',
    },
  },

  'dead-leaf-butterfly': {
    lesson: [
      {
        title: 'A Wingtip Like a Leaf Tip',
        body: 'When the wings fold upright together, the forewing’s outer corner draws out into a sharp point that matches the tip of a leaf exactly, giving the whole outline a leaf-like shape at once.',
        anchor: 'forewing',
      },
      {
        title: 'A Tail That Plays the Stalk',
        body: 'The hindwing tapers into a fine tail at its tip, landing right at the opposite end of the leaf shape and looking exactly like a leaf stalk — even this small detail isn’t overlooked.',
        anchor: 'tail',
      },
      {
        title: 'A Midrib and Mold Spots',
        body: 'The wing’s underside is dry yellow or brown, crossed by a dark line running its full length like a leaf’s central midrib, surrounded by scattered spots of varying shade that mimic mold and insect-bite marks.',
        anchor: 'underwing',
      },
      {
        title: 'No Two Leaves Look Alike',
        body: 'The depth of the dead-leaf pattern and placement of spots vary between individuals, as real fallen leaves differ; this variation makes it hard for predators to learn one fixed search image.',
      },
    ],
    motion: {
      title: 'A Sudden Color Change in Flight',
      body: 'The instant it opens its wings, the topside flashes bright blue and orange-red — a different insect entirely from its leaf-like resting self; landing and folding them, the color vanishes, often losing a pursuing predator.',
    },
    quiz: [
      {
        question: 'When the dead leaf butterfly folds its wings upright, which side of the wing shows on the outside?',
        options: [
          'The topside, the vivid blue-and-orange face',
          'The underside, brown with midrib lines and spots, closely resembling a dead leaf',
          'The edge-on side, a narrow slit showing no pattern at all',
        ],
        answer: 1,
        explain: 'With wings folded, the underside shows — brown, with midrib and spots; the vivid blue-orange topside appears only once the wings open in flight.',
      },
      {
        question: 'When the dead leaf butterfly opens its wings in flight and reveals its vivid topside, what does this do to help it evade predators?',
        options: [
          'Nothing — it’s purely a courtship display',
          'The sudden flash of color startles a pursuing predator, and it vanishes again the instant it lands and folds its wings',
          'The bright color reflects UV light and injures the predator’s eyes',
        ],
        answer: 1,
        explain: 'This is flash coloration: bright wings in flight startle predators, and folding them on landing instantly hides it again, often losing the pursuer.',
      },
    ],
    habitat: {
      title: 'Amid Forest-Floor Leaf Litter',
      body: 'It lives in the shaded understory of evergreen broadleaf forests, landing among dead branches and leaves to hide; adults skip flowers for rotting fruit and sap-oozing trunks, turning up often on forest trails in fall and winter.',
    },
  },

  'hawk-moth': {
    lesson: [
      {
        title: 'A Streamlined Body',
        body: 'The body is stout and spindle-shaped, narrow at the front and wider behind like a tiny torpedo, with long, stiff wings — a build that underlies its rapid wingbeats and nectar-sipping hover.',
        anchor: 'abdomen',
      },
      {
        title: 'Wingbeats Rival a Hummingbird',
        body: 'Its two pairs of narrow wings beat roughly 70–90 times a second, moving so fast the outline blurs into a haze with an audible hum; its hovering feeding posture closely resembles a hummingbird’s.',
        anchor: 'forewing',
      },
      {
        title: 'A Proboscis Longer Than Its Body',
        body: 'The slender tongue (proboscis) stays coiled like a watch spring at rest and unfurls only to feed; extended, it can exceed the moth’s own body length, reaching deep into a flower for nectar hidden well inside.',
        anchor: 'proboscis',
      },
      {
        title: 'Often Mistaken for Another Bird',
        body: 'Its hovering posture and build often make people think they’ve spotted a hummingbird, but no hummingbirds live in China — the small flier in front of them is, in fact, a genuine moth.',
      },
    ],
    motion: {
      title: 'Hovering in Place, Hummingbird-Style',
      body: 'While feeding it hangs motionless before a flower, wings tracing a tiny figure-eight and beating roughly 70–90 times a second for steady lift; this flight style converges strikingly with hummingbirds, though evolved independently.',
    },
    quiz: [
      {
        question: 'Someone claims to have seen a “hummingbird” by a flowerbed in China — what’s the most likely explanation?',
        options: [
          'China does have a very small hummingbird population',
          'What they saw was a hovering hawk-moth sipping nectar; China has no hummingbirds',
          'It was a chance glimpse of a hummingbird passing through on migration',
        ],
        answer: 1,
        explain: 'No hummingbirds live in China, only in the Americas; the hovering nectar-sipper is a hawk-moth, converging with hummingbirds despite being unrelated.',
      },
      {
        question: 'Roughly how long is the hummingbird hawk-moth’s proboscis when extended to feed?',
        options: [
          'Far shorter than its body, only about a tenth of its length',
          'Close to or longer than its own body length',
          'It can’t extend at all and stays coiled unused',
        ],
        answer: 1,
        explain: 'Its proboscis stays coiled at rest and unfurls to feed, reaching close to or beyond its own body length — long enough to probe deep into a flower.',
      },
    ],
    habitat: {
      title: 'A Visitor Among Flowerbeds',
      body: 'Commonly seen in gardens, field margins, and sunny wildflower patches, most active by day, especially bright afternoons; a patch of blooming honeysuckle or zinnias is often enough to draw it in for a good look at its nectar-hover.',
    },
  },

  'termite-soldier': {
    lesson: [
      {
        title: 'A Head, and Jaws, Larger Still',
        body: 'Its head is noticeably larger than a worker’s or young termite’s, with sickle-shaped jaws (mandibles) taking up nearly half the face; against its pale, soft body, the heavy head marks this soldier at a glance.',
        anchor: 'head',
      },
      {
        title: 'No Compound Eyes',
        body: 'Where compound eyes should sit, there’s nothing — the soldier is effectively blind, living in the colony’s pitch-dark tunnels, sensing scent, vibration, and nestmates’ pheromones only through its antennae.',
        anchor: 'head',
      },
      {
        title: 'Jaws That Can’t Feed It',
        body: 'These formidable mandibles are built only for piercing and tearing invading ants or other predators, with no ability to chew or grind food — the soldier fights with them but can’t eat with them.',
        anchor: 'mandible',
      },
      {
        title: 'Fed Entirely by Workers',
        body: 'Unable to bite off or chew food itself, the soldier depends entirely on workers to feed it mouth-to-mouth by regurgitation; without a worker’s care, even food right in front of it does the soldier no good.',
      },
    ],
    motion: {
      title: 'Opening Its Jaws Means War',
      body: 'The instant a nest tunnel is breached, soldiers rush to the gap and clamp their jaws onto the invading ant or other predator; this near-reflexive bite buys the workers and queen behind them time to retreat.',
    },
    quiz: [
      {
        question: 'Termites and ants look alike, but how are they actually related taxonomically?',
        options: [
          'Termites are actually a subfamily of ants, in the order Hymenoptera',
          'Termites belong to order Blattodea, close relatives of cockroaches; ants belong to Hymenoptera — the resemblance is convergent evolution',
          'They’re the same order, differing only in color and body shape',
        ],
        answer: 1,
        explain: 'Termites (order Blattodea) are close kin to cockroaches; ants (Hymenoptera) are closer to bees and wasps — the resemblance is convergent evolution.',
      },
      {
        question: 'Which statement about the black-winged subterranean termite’s soldier caste is correct?',
        options: [
          'It has well-developed compound eyes and excellent vision, directing workers in battle by sight',
          'It has no compound eyes and is blind; its jaws can only bite, not chew, so it must be fed by workers',
          'It can chew its own food but needs workers to help locate food sources',
        ],
        answer: 1,
        explain: 'The soldier is blind, sensing its surroundings only through antennae; its jaws can bite but not chew, so it survives on food regurgitated by workers.',
      },
    ],
    habitat: {
      title: 'Tunnels Beneath the Ground',
      body: 'The black-winged subterranean termite nests underground, building mud tubes along tree trunks and walls; soldiers guard breaches and entrances — look for these muddy tracks near wall bases or dead wood after a hot, humid rain.',
    },
  },
  'water-scavenger': {
    lesson: [
      {
        title: 'How the Antennae Breathe',
        body: "Near the surface, it tilts its head so short antennae pierce the water's film, drawing air along fine hairs into a silvery film on its belly — breathing without ever leaving the water, unseen by predators.",
        anchor: 'antenna',
      },
      {
        title: 'Maxillary Palps Take Over',
        body: 'With antennae reassigned, a pair of slender maxillary palps take over scouting — longer than the antennae, swaying as it swims to sniff out waterweed and detritus, a task most beetles leave to antennae.',
        anchor: 'palp',
      },
      {
        title: 'The Keeled Spine Underneath',
        body: 'Turned over, a ridge runs along its belly — a sharp keel ending in a spike; if a fish takes it into its mouth, the spike jabs the roof hard enough to make the fish spit the catch back out.',
        anchor: 'keel',
      },
      {
        title: 'Only the Larva Turns Predator',
        body: 'Adults are mild, feeding on waterweed and decaying matter; the larva is a fierce hunter instead, using hooked jaws to prey on snails and small aquatic animals — nearly opposite diets across one life cycle.',
      },
    ],
    motion: {
      title: 'Rowing With Alternating Legs',
      body: 'Swimming, its middle and hind legs stroke left-right in alternation like walking, swaying the body gently; the diving beetle instead kicks both legs together, shooting forward like an arrow — the stroke alone tells them apart.',
    },
    quiz: [
      {
        question: 'The giant black water scavenger beetle and the diving beetle both live underwater — how can their swimming style tell them apart?',
        options: [
          'The water scavenger beetle strokes its legs left-right in alternation, the diving beetle kicks both together',
          'The water scavenger beetle kicks both legs together, the diving beetle strokes left-right in alternation',
          'Their swimming styles are identical; only body color tells them apart',
        ],
        answer: 0,
        explain: 'It swims like walking, alternating legs with a gentle sway; the diving beetle instead kicks both together in one swift stroke.',
      },
      {
        question: 'What is the short, club-shaped antenna of the giant black water scavenger beetle mainly used for?',
        options: [
          'Scent-tracking, like most beetles use their antennae for',
          "Piercing the water's surface film to draw air into its belly's air film",
          'A weapon for striking rivals during combat',
        ],
        answer: 1,
        explain: "Its antennae are repurposed for breathing, drawing air into the belly's air film; scent-tracking instead falls to its long maxillary palps.",
      },
    ],
    habitat: {
      title: 'Among Still Ponds and Weeds',
      body: 'Weedy ponds, paddies and slow ditches are home, busiest in summer; by day it creeps along waterweed with a silvery air film on its belly, and by night flies to lights — a big black beetle under a lamp is often this species.',
    },
  },

  'checkered-beetle': {
    lesson: [
      {
        title: 'Red-and-Black Warning Bands',
        body: 'The elytra are blue-black with three bold red bands, easy to spot on a flower from afar; this loud pattern is a warning color, telling birds it tastes bad and to think twice before biting.',
        anchor: 'band',
      },
      {
        title: 'A Coat of Upright Bristles',
        body: 'Long bristles stand upright over its body; darting through blossoms picks up pollen it carries onward — incidental pollination. The same bristles double as touch sensors, catching stirs in the air behind it.',
        anchor: 'fuzz',
      },
      {
        title: 'A Hunter Among the Blooms',
        body: "Adults linger on umbrella-shaped flower clusters, grazing pollen and snatching small beetles and flies on the same blooms — an omnivorous diet; large compound eyes track every visitor on the flower's face.",
        anchor: 'eye',
      },
      {
        title: 'Larvae Break Into Bee Nests',
        body: "Females lay eggs near bee nests, and hatched larvae sneak into solitary bees' nest cells to feed on the bees' own larvae and pupae — the adult eats mostly plants, but its young turn carnivorous.",
      },
    ],
    motion: {
      title: 'A Quick Dash Among the Blooms',
      body: "It darts across a flower cluster fast, legs firing in quick bursts, then lunges the instant a small fly or beetle lands nearby, pinning it in one motion — a swift ambusher under cover of the blossoms.",
    },
    quiz: [
      {
        question: 'What does the larva of the Chinese checkered beetle feed on to grow?',
        options: [
          'Pollen and nectar, plant-based like the adult',
          'It sneaks into bee nests to prey on bee larvae and pupae',
          'Rotting leaves and decaying wood fragments',
        ],
        answer: 1,
        explain: "Adults feed on pollen and catch small insects on flowers; larvae instead invade bee nests to eat the bees' own larvae and pupae — a sharp diet shift.",
      },
      {
        question: "What is the main purpose of the checkered beetle's bright red-and-black banded elytra?",
        options: [
          'A warning color telling predators it tastes bad',
          'A courtship signal — the brighter, the more attractive',
          'Camouflage mimicking flower petals',
        ],
        answer: 0,
        explain: 'The red-and-black bands are a classic warning color, signaling bad taste to birds; many distasteful insects use similarly bold patterns.',
      },
    ],
    habitat: {
      title: 'Early-Summer Umbrella Flowers',
      body: "From early to mid-summer, look for umbrella flower clusters — wild carrot or Cnidium — along field edges, where these red-and-black beetles dart about; females sometimes lay eggs near orchard bee boxes.",
    },
  },

  'shining-chafer': {
    lesson: [
      {
        title: 'Where the Copper-Green Comes From',
        body: "The elytra's copper-green sheen isn't pigment but a structural color from microscopic layers interfering with light; tilt it and the hue drifts from green to gold to red — the color lives in structure, not dye.",
        anchor: 'elytra',
      },
      {
        title: 'A Small Shield at the Face',
        body: 'A broad, upturned clypeus sits at the front of the head like a small shield, guarding the folded mouthparts while it feeds; its shape varies by species within the chafer family, a key trait for classification.',
        anchor: 'clypeus',
      },
      {
        title: 'Antennae That Open Like a Fan',
        body: "The antenna tip has three plates that fan open like a lamellate antenna: folded it's a short stub; opened, it multiplies scent-catching surface, helping it find poplar and fruit trees after dark.",
        anchor: 'antenna',
      },
      {
        title: 'The Larva Is Called a Grub',
        body: 'The larva is the familiar white grub farmers know, curled C-shaped in soil, gnawing roots of peanuts and corn; adults instead swarm tree canopies at night to eat leaves — one life, two stages of damage.',
      },
    ],
    motion: {
      title: 'Playing Dead at a Touch',
      body: 'The moment a feeding adult feels a branch tremble, it folds its legs, drops off the leaf, and lies still in the grass briefly before flipping over to crawl or fly off — a drop-and-freeze trick standard to scarab beetles.',
    },
    quiz: [
      {
        question: 'Drop a shining leaf chafer into alcohol — what happens to its copper-green color?',
        options: [
          'It quickly fades to gray-white as alcohol dissolves the color away',
          'It does not fade — the color comes from structure, not pigment',
          'It turns red as alcohol alters the pigment',
        ],
        answer: 1,
        explain: "The copper-green comes from light interference in tiny layers, so it won't dissolve in alcohol; a pigment color would instead bleed out and fade.",
      },
      {
        question: "What is the relationship between the crop pest 'white grub' and the shining leaf chafer?",
        options: [
          'The white grub is exactly its larva, gnawing crop roots underground',
          'The white grub is a moth larva unrelated to it',
          "The white grub preys on the chafer's eggs as a natural enemy",
        ],
        answer: 0,
        explain: "'White grub' is the general name for scarab larvae; this chafer's grub eats roots below while the adult eats leaves above — both are pest targets.",
      },
    ],
    habitat: {
      title: 'Poplar Canopies on Summer Nights',
      body: 'Muggy nights in June and July are prime viewing time: streetlights draw copper-green crowds, and poplar, elm and apple canopies fill with feeding swarms that can strip leaves to lace in days; by day it hides in soil, rarely seen.',
    },
  },

  'assassin-bug': {
    lesson: [
      {
        title: 'How the Curved Beak Feeds',
        body: "The stout rostrum folds under the head at rest, then swings forward to stab prey; it injects saliva that liquefies the prey's insides, then draws the fluid back — external digestion inside the victim.",
        anchor: 'rostrum',
      },
      {
        title: 'The Beak Doubles as a Fiddle',
        body: "A ridged groove runs along the pronotum's underside; when threatened, it drags the beak tip across the ridges, making a rasping sound. Handling one often earns a painful jab — best to watch, not touch.",
        anchor: 'pronotum',
      },
      {
        title: 'Forelegs Like a Vise',
        body: 'The stout forelegs bear short spines and sticky pads at the tip; the instant they clamp onto prey, they close like a vise to hold it still while the beak finds its mark, often after a light test tap first.',
        anchor: 'foreleg',
      },
      {
        title: 'The Odd One Out Among Bugs',
        body: 'Most true bugs use their beak to drink sap from stems and leaves, but the assassin bug turns the same mouthpart into a weapon aimed at insects; aphids and caterpillars are on the menu, a welcome orchard guard.',
      },
    ],
    motion: {
      title: 'One Strike Settles It',
      body: 'It creeps close, then strikes in a flash — forelegs pinning the prey as the beak drives in at once, usually into the soft gap between head and thorax; the saliva leaves the victim limp within seconds, and it feeds unhurried.',
    },
    quiz: [
      {
        question: 'How does an assassin bug consume a caterpillar it has caught?',
        options: [
          'It chews the caterpillar into pieces with mandibles and swallows',
          "It injects digestive fluid that liquefies the caterpillar's insides, then draws the fluid back",
          'It swallows the caterpillar whole and digests it slowly inside',
        ],
        answer: 1,
        explain: 'Assassin bugs lack chewing mouthparts; the beak injects saliva that digests prey internally, then sucks the fluid back — external digestion.',
      },
      {
        question: 'How does an assassin bug produce the rasping sound it makes when threatened?',
        options: [
          'By vibrating its wings against the edge of the abdomen',
          'By scraping the beak tip back and forth across ridges on the underside of the thorax',
          'By expelling air quickly through its breathing pores',
        ],
        answer: 1,
        explain: 'It drags the beak tip through a ridged groove on the pronotum, like a bow across a fiddle; crickets rasp with wings, this bug rasps with its beak.',
      },
    ],
    habitat: {
      title: 'Ambush Posts in the Underbrush',
      body: "Shrubs, grassland, orchards and farmland all host its ambush points; summer and autumn days are best for watching it stalk leaves, and some species fly to streetlights after dark — watch, not touch, it stings worse than a bee.",
    },
  },

  bumblebee: {
    lesson: [
      {
        title: 'Fuzz as a Winter Coat',
        body: 'Dense fuzz covers the body, trapping pollen and insulating it: paired with heat from flight muscles, it lets the bumblebee fly on near-freezing mornings — often the only pollinator for alpine flowers.',
        anchor: 'fuzz',
      },
      {
        title: 'Vibrating the Whole Chest',
        body: "Flight muscles don't pull the wing bases directly; they squeeze and release the thorax, and the wings snap along as the chest flexes fast — this indirect system powers bees, flies and other fast wingbeats.",
        anchor: 'wing',
      },
      {
        title: 'A Pollen Basket on the Hind Leg',
        body: 'The outer hind shin is smooth and concave, ringed by long hairs, forming a built-in pollen basket; workers brush pollen from their fuzz into it, pack it with nectar, until each leg carries a bright yellow ball.',
        anchor: 'pollenBasket',
      },
      {
        title: 'Shaking Loose a Rain of Pollen',
        body: "Tomato and blueberry anthers are like pepper shakers with tiny holes; the bumblebee bites the anther and buzzes its flight muscles to shake pollen loose — buzz pollination, a trick honeybees can't do.",
        anchor: 'abdomen',
      },
    ],
    motion: {
      title: 'Shivering to Warm Up Before Takeoff',
      body: 'On cold mornings, before takeoff it disengages flight muscles and lets them shiver like an engine warming up, raising chest temperature to about 30°C; that trick, plus thick fuzz, lets it forage when honeybees stay hived.',
    },
    quiz: [
      {
        question: "'By the laws of fluid dynamics, bumblebees shouldn't be able to fly' — what's the truth behind that claim?",
        options: [
          'Bumblebees really do defy fluid dynamics, and science still cannot explain it',
          'Early simplified models failed the math; accounting for wingtip vortices explains it fully',
          "Bumblebees don't actually fly — they only glide over long distances",
        ],
        answer: 1,
        explain: 'That claim applied fixed-wing formulas to flapping flight; vortices from rapidly beating wings supply plenty of lift, so the flight is no mystery.',
      },
      {
        question: 'Why do greenhouse tomato growers specifically bring in bumblebees for pollination?',
        options: [
          'Bumblebees fly faster than honeybees, so they pollinate more efficiently',
          'Tomato anthers only release pollen under high-frequency vibration, which bumblebees can do and honeybees cannot',
          'Tomato nectar is toxic to honeybees but harmless to bumblebees',
        ],
        answer: 1,
        explain: 'Tomato anthers release pollen only under high-frequency vibration; bumblebees buzz their flight muscles to shake it loose, a trick honeybees lack.',
      },
    ],
    habitat: {
      title: 'Early-Spring Flower Patches',
      body: 'Bumblebees range from lowland fields to alpine meadows, standing out most in cold regions; in early spring, an overwintered queen emerges first, founding a nest alone as fruit trees bloom — a chilly-morning visitor is usually her.',
    },
  },

  cricket: {
    lesson: [
      {
        title: 'The Right Wing Presses the Left',
        body: "Males lay their forewings asymmetrically, right wing on top: fine teeth on the right wing's underside form a scraper file, the left wing's edge a hard ridge — opening and closing together makes the clear chirp.",
        anchor: 'stridulator',
      },
      {
        title: 'Ears Sit on the Front Legs',
        body: "A cricket's ears aren't on its head, but on its front leg shins — a pair of oval eardrums angled toward the sound; the two front legs work like separate ears, using timing differences to locate a rival or mate.",
      },
      {
        title: 'Tail Bristles Sense the Rear',
        body: "A pair of long bristles at the abdomen's tip is covered in sensory hairs catching the faintest air stir from behind; a predator's pounce stirs enough breeze to trigger an instant leap, faster than looking back.",
        anchor: 'cercus',
      },
      {
        title: 'Hind Legs as a Catapult',
        body: "The hind leg's thigh is thick as a drumstick, packed with jumping muscle; startled, it locks the muscle taut, then releases, launching itself dozens of times its body length — a loser escapes on these legs too.",
        anchor: 'hindleg',
      },
    ],
    motion: {
      title: 'Chirping Through the Autumn Night',
      body: "While singing, a male raises both forewings at an angle and opens and closes them dozens of times a second, the right wing's file scraping the left wing's ridge as the wings double as a soundboard; each mood gets its own rhythm.",
    },
    quiz: [
      {
        question: "Both crickets and katydids chirp by rubbing their forewings — what's the difference between them?",
        options: [
          "The cricket's right wing lies over the left; the katydid's left wing lies over the right",
          "The cricket's left wing lies over the right; the katydid's right wing lies over the left",
          'Both always have the right wing on top, built identically',
        ],
        answer: 0,
        explain: 'When a cricket sings, the right wing sits on top with its file underneath; katydids do the opposite, left wing on top — a mirror-image trick.',
      },
      {
        question: "To locate a fighting cricket's ears, which body part should be examined?",
        options: [
          'The sides of the head, behind the compound eyes',
          'The oval eardrums on the shins of the front legs',
          'A pair of small openings at the base of the antennae',
        ],
        answer: 1,
        explain: "A cricket's eardrums sit on its front leg shins, each leg acting like a separate ear judging direction from timing gaps — there's no ear on the head.",
      },
    ],
    habitat: {
      title: 'Along Walls and Stone Cracks',
      body: "Nights after early autumn are liveliest: house foundations, field edges and brick piles turn into singing stages, and a flashlight beam finds a chirping male at a burrow mouth — the 'weaver' of China's cricket-fighting culture.",
    },
  },

  'robber-fly': {
    lesson: [
      {
        title: 'A Mustache to Guard the Face',
        body: 'A dense ring of stiff bristles, the mystax, guards the mouthparts like a wire mesh; a captured bee or wasp often thrashes and stings, and this ring stands between the eyes and mouthparts — a robber-fly guard.',
        anchor: 'mystax',
      },
      {
        title: 'A Valley Between the Eyes',
        body: "Two huge compound eyes leave a distinct hollow atop the head, a trademark of this family; the wide gap between them acts like an extended rangefinder, helping it judge a target's distance in high-speed flight.",
        anchor: 'eye',
      },
      {
        title: 'Six Legs Close Like a Cage',
        body: 'Long, sturdy legs bristling with spines snap shut like a cage the instant it collides with prey midair; back on a perch, its mouthparts stab in, injecting venom that paralyzes nerves and dissolves tissue.',
        anchor: 'foreleg',
      },
      {
        title: 'Choosing Only Tough Targets',
        body: 'Dragonflies, wasps and tiger beetles — hunters themselves — appear on its menu; with explosive flight and a sharp attack angle, it strikes just as a rival takes off, earning its aerial-predator name honestly.',
        anchor: 'wing',
      },
    ],
    motion: {
      title: 'An Ambush From a Perch',
      body: 'It waits like a fighter jet on an open perch, then launches the instant its eyes lock onto a passing insect, curving in from behind to grip the target and haul it back to the perch to feed — rarely more than a second or two.',
    },
    quiz: [
      {
        question: "What is the main purpose of the dense bristles ringing a robber fly's mouthparts?",
        options: [
          'Filtering pollen out of the air as food',
          'Blocking counterattacks from struggling prey to protect the head',
          'Decoration to impress females during courtship',
        ],
        answer: 1,
        explain: "Robber flies often catch dangerous prey like stinging bees, and the bristle ring shields the eyes and mouth from a struggling victim's counterattack.",
      },
      {
        question: "Which of the following insects turns up on a robber fly's menu?",
        options: [
          'Only small, weak insects such as mosquitoes and flies',
          'Even hunters like dragonflies and wasps end up on the list',
          "It doesn't take live prey, only licks sap oozing from tree wounds",
        ],
        answer: 1,
        explain: 'The robber fly is a top aerial predator, taking on dragonflies and wasps with ambush and venom — it wins through surprise, not head-on combat.',
      },
    ],
    habitat: {
      title: 'A Sunlit Perch on a Branch Tip',
      body: "On clear midsummer days, check forest edges, riverbanks and grassy slopes, especially sun-warmed dead twigs and fence posts; a large-eyed, bristly 'heavyweight' often perches there scanning the sky, returning after each strike.",
    },
  },

  'crane-fly': {
    lesson: [
      {
        title: 'Wrongly Accused as a Giant Mosquito',
        body: "Built like an oversized mosquito, it's often swatted as a 'monster mosquito'; in truth its mouthparts are reduced, unable to bite, and most adults barely feed, spending their brief life seeking mates.",
        anchor: 'abdomen',
      },
      {
        title: 'Halteres Are the Easiest Clue',
        body: "The hindwings have shrunk into short, ball-tipped stalks called halteres, vibrating fast in flight like a built-in gyroscope; a crane fly's halteres are unusually long and plainly visible to the naked eye.",
        anchor: 'haltere',
      },
      {
        title: 'Legs Built to Snap Off',
        body: "Its six legs are absurdly long and thin, each joint fitted with a breaking point: caught by a predator or stuck in a web, the leg simply detaches so the rest escapes; a lost adult leg, though, never grows back.",
        anchor: 'leg',
      },
      {
        title: 'A Wobbly, Swaying Flight',
        body: 'A pair of narrow forewings beats slowly, giving the crane fly a wobbly flight that hugs the grass for short hops; that clumsy style, plus zero offense, makes it easy prey for birds, spiders and mantises.',
        anchor: 'wing',
      },
    ],
    motion: {
      title: 'Escaping by Shedding a Leg',
      body: 'The instant a beak or web grips one leg, the crane fly contracts a muscle, snapping that leg off cleanly along its built-in break, then flees in the split second its captor hesitates — one leg traded for its life.',
    },
    quiz: [
      {
        question: "A 'giant mosquito' flies into the house — will it bite and drink blood?",
        options: [
          'Yes, and it drinks even more than an ordinary mosquito',
          'No — crane flies have reduced mouthparts, and adults barely feed at all',
          'Only the males avoid biting; the females do bite',
        ],
        answer: 1,
        explain: "A crane fly only resembles an enlarged mosquito; its mouthparts are too weak to bite, and it neither drinks blood nor feeds much at all.",
      },
      {
        question: 'After a crane fly sheds a leg to escape, what happens to that missing leg?',
        options: [
          'A full new leg grows back within a few days',
          'It never regrows — the fly goes the rest of its life with one leg fewer',
          'Two thinner new legs sprout from the stump',
        ],
        answer: 1,
        explain: "Shedding a leg is a deliberate survival move, but adults no longer molt, so it can't regrow; some crane flies go on living with several legs missing.",
      },
    ],
    habitat: {
      title: 'Over Damp Grass at Dusk',
      body: 'On spring and autumn evenings, lawns and streamside wetlands near homes show its wobbly, low flight, and after dark it bumps window screens drawn to light; the larva lives in damp soil, feeding on decay and grass roots.',
    },
  },

  mantidfly: {
    lesson: [
      {
        title: 'A Knockoff Praying Mantis',
        body: 'A pair of raptorial forelegs matches a mantis almost exactly — spined thigh, folding shin, poised to snap out and grab prey; yet it shares no kinship with mantises, this look evolved on its own.',
        anchor: 'raptorialLeg',
      },
      {
        title: 'The Point of the Long Neck',
        body: "The pronotum stretches into a 'neck' that carries the head and forelegs forward, extending reach for the strike — much like a mantis's own elongated thorax; convergent evolution copied the design twice.",
        anchor: 'pronotum',
      },
      {
        title: 'The Wings Give It Away',
        body: 'At rest, four clear wings lie roof-like over its back, veins woven into a dense net — the mark of the lacewing order, kin to the green lacewing; a mantis instead folds leathery forewings flat, an easy tell.',
        anchor: 'wing',
      },
      {
        title: 'Larvae Move Into an Egg Sac',
        body: 'Many first-stage larvae seek out spider egg sacs, some hitching a ride as the spider lays eggs; inside, the larva feeds on the eggs until it pupates — the adult looks like a mantis, but the larva is a parasite.',
      },
    ],
    motion: {
      title: 'A Miniature Sickle Strike',
      body: 'It lies in wait among flowers and leaves, angling its long thorax to bring its body toward a target, then snaps the forelegs out like lightning to grab an aphid or small fly; the strike copies a mantis, just several sizes smaller.',
    },
    quiz: [
      {
        question: 'The mantidfly carries a pair of mantis-style raptorial forelegs — which order does it actually belong to?',
        options: [
          'Mantodea, a small branch of the mantis family',
          'Neuroptera, closely related to green lacewings',
          'Hemiptera, related to assassin bugs',
        ],
        answer: 1,
        explain: "The mantidfly belongs to Neuroptera, kin to green lacewings; its forelegs and neck came from convergent evolution with mantises, a distant relative.",
      },
      {
        question: 'Where do many mantidfly larvae grow up?',
        options: [
          "Inside a spider's egg sac, feeding on the eggs",
          'Underwater, preying on mosquito larvae',
          'In soil, gnawing on plant roots',
        ],
        answer: 0,
        explain: 'First-stage larvae seek out and enter spider egg sacs, some hitching a ride first; feeding on eggs until pupation is a rare parasitic path.',
      },
    ],
    habitat: {
      title: 'A Nighttime Visitor at the Lamp',
      body: "By day it hides among flowers and shrub leaves, striking a mini-mantis pose to ambush aphids and small flies; on summer nights it's drawn to lights, landing on lamps and screens — check the wings to confirm its identity.",
    },
  },

  caddisfly: {
    lesson: [
      {
        title: 'Hairy Wings, Not Scaled Wings',
        body: "The wings are covered in fine hair, not scales — hence the order name Trichoptera, 'hairy wing.' Caddisflies are the sister group of moths. A moth sheds 'powder' — scales; a caddisfly's wing has only hair.",
        anchor: 'hairyWing',
      },
      {
        title: 'Antennae Longer Than the Body',
        body: 'Thread-like antennae often exceed body length, held forward at rest, paired with wings folded roof-like over the back, giving it the look of a slender moth; those long antennae are the first clue at night.',
        anchor: 'antenna',
      },
      {
        title: 'Maxillary Palps as Cutlery',
        body: "The adult's chewing mouthparts have degenerated, unable to handle solid food, so it relies on maxillary palps to dab up nectar and moisture; the short adult stage is near-fasting, living off larval reserves.",
        anchor: 'palp',
      },
      {
        title: 'An Underwater Architect',
        body: 'The larva, called a caddisworm, lives on the streambed, spinning silk to bind sand, pebbles or leaf bits into a case it carries everywhere, retreating fully inside at danger; style and material vary by species.',
      },
    ],
    motion: {
      title: 'Carrying Its House Along',
      body: "As the caddisworm crawls the streambed, its head and thorax reach from the case mouth with six legs gripping the ground, hauling the 'house' forward, and at danger it snaps back inside, sealing the entrance with its hardened head.",
    },
    quiz: [
      {
        question: "Caddisflies look a lot like moths — what's the most reliable way to tell them apart?",
        options: [
          'Caddisfly wings are covered in fine hair, moth wings in scales',
          'Caddisflies are always much larger-bodied than moths',
          'Caddisflies fly by day, moths only fly at night',
        ],
        answer: 0,
        explain: 'Trichoptera (caddisflies) have hair-covered wings, Lepidoptera (moths) have scale-covered wings — the names of both orders come from this difference.',
      },
      {
        question: 'A stream with a large population of caddisworms usually indicates what about the water?',
        options: [
          'Relatively good water quality with low pollution',
          'The water body is severely eutrophic',
          'The water is too warm for fish to survive',
        ],
        answer: 0,
        explain: 'Caddisfly larvae are sensitive to oxygen and pollution, a classic water-quality gauge alongside mayflies and stoneflies — numbers signal cleanliness.',
      },
    ],
    habitat: {
      title: 'Dusk Swarms Along the Stream',
      body: "Clear streams and lake shores are home: at dusk, adults swarm above the water, and after dark they cluster at streetlights on the bank; by day, turning streambed stones often reveals a caddisworm inside its sand-and-pebble case.",
    },
  },
  'house-fly': {
    lesson: [
      {
        title: 'Read the Stripes',
        body: "Look at the thorax: four dark stripes running front to back on a gray ground — the house fly's ID card. Among a hundred thousand fly species, the one on your dinner table is named by those four lines.",
        anchor: 'stripe',
      },
      {
        title: 'It Laps, Never Bites',
        body: "The mouthparts are a sponge mop: a short drooping proboscis tipped with two grooved pads. The fly spits saliva to dissolve sugar, then draws the syrup back up — it cannot bite, and carries no needle.",
        anchor: 'proboscis',
      },
      {
        title: 'Walking the Ceiling',
        body: 'Each foot ends in a pair of adhesive pads covered in fine hairs that ooze a sticky film, gripping glass by wet adhesion. Six feet lift and land in turn, so some always hold on — and the ceiling becomes a floor.',
        anchor: 'pulvillus',
      },
      {
        title: 'Why Swatting Fails',
        body: 'One pair of wings does all the flying; the hindwings are tiny hidden balancers. No run-up needed — a backward hop, a wingbeat, airborne — and its eyes react to a looming shadow far faster than your hand.',
        anchor: 'wing',
      },
    ],
    motion: {
      title: 'The Secret of Hand-Rubbing',
      body: 'A resting fly forever rubs its legs, wipes its head, strokes its wings. Its taste receptors sit on its feet, so every landing is a tasting; scrubbing off dust and stale odors keeps the next footstep in sugar water readable.',
    },
    quiz: [
      {
        question: 'When a house fly lands on food, how does it actually eat?',
        options: ['It stabs in a needle-like mouthpart and sucks', 'It spits digestive juices to soften the food, then mops it up with spongy pads', 'It chews off small bites with its jaws'],
        answer: 1,
        explain: 'Sponging mouthparts can only lap liquids: solids must first be dissolved in saliva. The fly has nothing that can pierce or chew.',
      },
      {
        question: 'What lets a house fly hang upside down from the ceiling?',
        options: ['Constantly beating wings', 'Foot pads that secrete a sticky film', 'A suction cup on its abdomen'],
        answer: 1,
        explain: 'Hairs on the foot pads ooze a sticky film that grips smooth surfaces by wet adhesion; the six feet take turns lifting, so the hold is never lost.',
      },
    ],
    habitat: {
      title: 'Wherever People Are',
      body: 'The house fly barely exists apart from us; its life follows human habits. Garbage bins, manure heaps, and kitchen counters serve as nursery and dining room, and with a generation every two warm weeks, it spans the globe.',
    },
  },
  mosquito: {
    lesson: [
      {
        title: 'Naming a House Mosquito',
        body: 'A resting Culex holds its body roughly parallel to the wall, tail not raised (an Anopheles tilts head-down, tail-up). Then check the abdomen: a pale band at each segment base. Both match — pale house mosquito.',
        anchor: 'band',
      },
      {
        title: 'A Precision Needle Kit',
        body: 'The proboscis is not one needle but six stylets in a sheath: two saw-edged blades open the skin, two hold steady, one pumps in anticoagulant saliva, one draws blood. The itch is an allergy to that saliva.',
        anchor: 'proboscis',
      },
      {
        title: 'Antennae Tell the Sexes',
        body: "A female's antennae are slim threads with sparse whorls of short hair; a male's are feathery plumes — his 'ears', tuned to a female's wingbeat hum. Only females bite; a male's mouthparts cannot even break skin.",
        anchor: 'antenna',
      },
      {
        title: 'Scales on the Wing',
        body: "Mosquito wings are narrow, their veins and edges fringed with tiny scales — the family crest; other flies carry bare film. Beating hundreds of times a second, the telltale whine also helps them find each other.",
        anchor: 'wing',
      },
    ],
    motion: {
      title: 'Anatomy of a Bite',
      body: 'After landing, the female probes for a capillary-rich patch, then the six stylets cut in by turns, trading anticoagulant saliva for blood. Within minutes she takes on nearly twice her weight, abdomen glowing red, and pulls out.',
    },
    quiz: [
      {
        question: 'Which mosquitoes drink blood?',
        options: ['All mosquitoes do', 'Only females, to develop their eggs', 'Only males, to show off when courting'],
        answer: 1,
        explain: 'Blood is a nutritional need for egg development, so only females bite; males have feeble mouthparts and live entirely on nectar and plant juices.',
      },
      {
        question: 'How does a pale house mosquito hold itself when resting on a wall?',
        options: ['Body roughly parallel to the wall', 'Head down with the tail tilted high', 'Always hanging upside down'],
        answer: 0,
        explain: 'Culex rests parallel to the surface; the head-down, tail-up slant belongs to Anopheles — the fastest field mark separating the two.',
      },
    ],
    habitat: {
      title: 'A Life Beside Still Water',
      body: 'The water in one discarded tire or a flowerpot saucer is childhood enough: eggs float in rafts, wrigglers hang head-down filtering below, even the pupa somersaults in it. Emptying standing water beats any mosquito coil.',
    },
  },
  cockroach: {
    lesson: [
      {
        title: 'Two Stripes Say It All',
        body: 'Plenty of roaches are small and tea-brown; this one carries its ID on the pronotum — two dark stripes, front edge to rear. Nymphs lack wings, but wear the stripes from hatching, so any age can be named.',
        anchor: 'stripe',
      },
      {
        title: 'The Hidden Head',
        body: "A cockroach's head is not out in front: it tucks under the pronotum shield, mouthparts down, so only the crown shows from above. The frailest part stays plated — and the body packs flatter for the cracks.",
        anchor: 'head',
      },
      {
        title: 'Eyes in the Back',
        body: "The cerci at the tail are rear-view mirrors: their hairs catch the faintest puff of air from behind. A slipper's gust arrives before the slipper — the cerci fire, the signal goes straight to the legs, gone.",
        anchor: 'cercus',
      },
      {
        title: 'Wings It Never Uses',
        body: 'Leathery forewings cover the abdomen and look flight-ready, yet it almost never flies. Its escape plan is the crack: a flattened body and spiny legs turn any gap a few millimeters wide into a safety door.',
        anchor: 'wing',
      },
    ],
    motion: {
      title: 'The Split-Second Getaway',
      body: 'A startled cockroach launches in tens of milliseconds: the cerci feel the air move, and an abdominal nerve center — not the brain — fires the legs. It swings its back to the threat and sprints, cornering along walls mid-run.',
    },
    quiz: [
      {
        question: 'How do you pick the German cockroach out of a crowd of small roaches?',
        options: ['By the two dark stripes on its pronotum', 'By whether it can fly', 'By the shade of its abdomen'],
        answer: 0,
        explain: 'The paired pronotal stripes are its most stable field mark, kept from nymph to adult — far more reliable than size or overall color.',
      },
      {
        question: 'The slipper has not even landed and the roach is gone — what warned it?',
        options: ['Its compound eyes saw the slipper', 'Its cerci felt the gust the strike pushed ahead', 'It heard the footsteps'],
        answer: 1,
        explain: 'Hairs on the cerci sense the faintest air current; the signal bypasses the brain, driving the legs via an abdominal nerve center in milliseconds.',
      },
    ],
    habitat: {
      title: 'Between Radiator and Crack',
      body: 'Its housing checklist has three lines: warm, damp, and a crack. The pipe gap under the sink, the space by a fridge compressor, a microwave base — all five-star nests. It hides by day and files out along the baseboard at night.',
    },
  },
}

export const getGuide = (id: string): Guide | undefined => GUIDES[id]
