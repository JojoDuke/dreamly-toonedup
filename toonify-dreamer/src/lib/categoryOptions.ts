export type StyleOption = {
  id: string;
  name: string;
  disabled?: boolean;
  comingSoon?: boolean;
};

export type CategoryOption = {
  id: string;
  name: string;
  styles: StyleOption[];
};

export const CATEGORY_OPTIONS: CategoryOption[] = [
  // Anime
  {
    id: "anime",
    name: "Anime",
    styles: [
      {
        id: "ghibli",
        name: "Studio Ghibli",
      },
      {
        id: "onePiece",
        name: "One Piece",
      },
      {
        id: "dragonBall",
        name: "Dragon Ball",
      },
      {
        id: "aot",
        name: "Attack on Titan",
      },
      {
        id: "demonsSlayer",
        name: "Demon Slayer",
      },
      {
        id: "narutoShinobiHeadband",
        name: "Naruto",
      },
      {
        id: "ninetiesAnime",
        name: "90s Anime",
      },
    ],
  },
  // Cartoons
  {
    id: "cartoons",
    name: "Cartoons",
    styles: [
      {
        id: "simpsons",
        name: "The Simpsons",
      },
      {
        id: "rickMorty",
        name: "Rick and Morty",
      },
      {
        id: "familyGuy",
        name: "Family Guy",
      },
      {
        id: "southPark",
        name: "South Park",
      },
      {
        id: "pixar",
        name: "Pixar",
      },
      {
        id: "avatarWaterTribe",
        name: "Avatar Water Tribe",
      },
      {
        id: "avatarAirNomad",
        name: "Avatar Air Nomad",
      },
      {
        id: "avatarFireNation",
        name: "Avatar Fire Nation",
      },
      {
        id: "avatarEarthKingdom",
        name: "Avatar Earth Kingdom",
      },
      {
        id: "rubberHoseCartoon",
        name: "30s Rubber Hose Cartoon",
      },
    ],
  },
  // Art
  {
    id: "art",
    name: "Art",
    styles: [
      {
        id: "pixel",
        name: "Pixel Art",
      },
      {
        id: "sketch",
        name: "Sketch Art",
      },
      {
        id: "watercolor",
        name: "Watercolor"
      },
      {
        id: "manga",
        name: "Manga",
      },
      {
        id: "comicBook",
        name: "Comic Book",
      },
      {
        id: "comicBookCover",
        name: "Comic Book Cover",
      },
      {
        id: "starryNight",
        name: "Starry Night",
      },
      {
        id: "graphicArt",
        name: "Graphic Art",
      },
      {
        id: "renaissance",
        name: "Renaissance",
      },
      {
        id: "drSeuss",
        name: "Dr Seuss",
      },
      {
        id: "statue",
        name: "Statue",
      },
      {
        id: "statueBust",
        name: "Statue Bust",
      },
      {
        id: "ukiyoE",
        name: "Ukiyo-e",
      },
      {
        id: "yamatoE",
        name: "Yamato-e",
      },
      {
        id: "theScream",
        name: "The Scream",
      },
      {
        id: "baroque",
        name: "Baroque",
      },
      {
        id: "monaLisa",
        name: "Mona Lisa",
      },
      {
        id: "popArtRoyLichtenstein",
        name: "Pop Art",
      },
      {
        id: "impressionismClaudeMonet",
        name: "Impressionism",
      },
      {
        id: "picasso",
        name: "Picasso",
      },
      {
        id: "andyWarhol",
        name: "Andy Warhol",
      },
      {
        id: "caricature",
        name: "Caricature",
      },
    ],
  },
  // History
  {
    id: "history",
    name: "History",
    styles: [
      {
        id: "samurai",
        name: "Samurai",
      },
      {
        id: "ninja",
        name: "Ninja",
      },
      {
        id: "wwiiSoldier",
        name: "WWII Soldier",
      },
      {
        id: "armyMan",
        name: "Army Man",
      },
      {
        id: "mayanWarrior",
        name: "Mayan Warrior",
      },
      {
        id: "pirate",
        name: "Pirate",
      },
      {
        id: "cowboy",
        name: "Cowboy",
      },
      {
        id: "zuluWarrior",
        name: "Zulu Warrior",
      },
      {
        id: "viking",
        name: "Viking",
      },
      {
        id: "medievalKnight",
        name: "Medieval Knight",
      },
      {
        id: "gladiator",
        name: "Gladiator",
      },
    ]
  },
  // Pop Culture
  {
    id: "popCulture",
    name: "Pop Culture",
    styles: [
      {
        id: "moviePoster",
        name: "Movie Poster",
      },
      {
        id: "retro80s",
        name: "80's Retro",
      },
      {
        id: "musicCover",
        name: "Music Cover",
      },
      {
        id: "timeMagazine",
        name: "Time Magazine",
      },
      {
        id: "forbes400MagazineCover",
        name: "Forbes 400 Magazine Cover",
      },
      {
        id: "timePersonOfTheYear",
        name: "Time Person of the Year",
      },
      {
        id: "peoplesMagazine",
        name: "Peoples Magazine",
      },
      {
        id: "peoplesSexiestManAlive",
        name: "Peoples Sexiest Man Alive",
      },
      {
        id: "jedi",
        name: "Jedi",
      },
      {
        id: "sithLord",
        name: "Sith Lord",
      },
      {
        id: "bigNate",
        name: "Big Nate",
      },
      {
        id: "diaryOfAWimpyKid",
        name: "Diary of a Wimpy Kid",
      },
      {
        id: "bookNovelCover",
        name: "Book/Novel Cover",
      },
      {
        id: "vinylSleeveRockBand",
        name: "Vinyl Sleeve, Rock Band",
      },
      {
        id: "collectiblePlayingCards",
        name: "Collectible Playing Cards",
      },
      {
        id: "cyberpunk",
        name: "Cyberpunk",
      },
    ],
  },
  // Athlete
  {
    id: "athlete",
    name: "Athlete",
    styles: [
      {
        id: "footballer",
        name: "Footballer",
      },
      {
        id: "nbaStar",
        name: "NBA Star",
      },
      {
        id: "nflPlayer",
        name: "NFL Player",
      },
      {
        id: "tennisPlayer",
        name: "Tennis Player",
      },
      {
        id: "baseballPlayer",
        name: "Baseball Player",
      },
      {
        id: "cricketPlayer",
        name: "Cricket Player",
      },
      {
        id: "wwe",
        name: "WWE Superstar",
      },
      {
        id: "sumoWrestler",
        name: "Sumo Wrestler",
      },
      {
        id: "trackRunner",
        name: "Track Runner",
      },
    ],
  },
  // Toys
  {
    id: "toys",
    name: "Toys",
    styles: [
      {
        id: "lego",
        name: "Legos",
      },
      {
        id: "funkoPop",
        name: "Funko Pop",
      },
      {
        id: "actionFigure",
        name: "Action Figure",
      },
      {
        id: "plushie",
        name: "Plushie",
      },
    ],
  },
  // Fashion Model
  {
    id: "fashionModel",
    name: "Fashion Model",
    styles: [
      {
        id: "model",
        name: "Model",
      },
      {
        id: "headshot",
        name: "Headshot",
      },
      {
        id: "runwayModel",
        name: "Runway Model",
      },
      {
        id: "swimsuitModel",
        name: "Swimsuit Model",
      },
      {
        id: "suitAndTie",
        name: "Suit and Tie",
      },
      {
        id: "highFashion",
        name: "High Fashion",
      },
      {
        id: "cinematicOverhead",
        name: "Cinematic Overhead",
      }
    ],
  },
  // Memes
  {
    id: "memes",
    name: "Memes",
    styles: [
      {
        id: "doge",
        name: "Doge",
      },
      {
        id: "absoluteCinema",
        name: "Absolute Cinema",
      },
      {
        id: "disasterGirl",
        name: "Disaster Girl",
      },
    ]
  },
  // Others
  {
    id: "other",
    name: "Other",
    styles: [
      {
        id: "thinker",
        name: "The Thinker",
      },
      {
        id: "muppets",
        name: "Muppets",
      },
      {
        id: "noir",
        name: "Noir",
      },
      {
        id: "videoGameCover",
        name: "Video Game Cover",
      },
      {
        id: "superhero",
        name: "Superhero",
      },
      {
        id: "mountRushmore",
        name: "Mount Rushmore",
      },
      {
        id: "collectibleActionFigure",
        name: "Collectible Action Figure",
      },
      {
        id: "minecraft",
        name: "Minecraft",
      },
      {
        id: "sticker",
        name: "Sticker",
      },
      {
        id: "moreHair",
        name: "More hair",
      },
      {
        id: "bald",
        name: "Bald",
      },
      {
        id: "fullBeard",
        name: "Full beard",
      },
      {
        id: "faceOnTshirt",
        name: "Face on T-shirt",
      },
    ],
  },
]; 