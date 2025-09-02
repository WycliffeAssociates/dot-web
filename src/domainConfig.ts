const config: Record<string, Record<string, string>> = {
  benin: {
    playlist: "benin-new-testament",
    license: "benin.md",
    aboutImg: "benin-example",
    displayName: "Benin New Testament",
  },
  ghana: {
    playlist: "ghana-new-testament",
    license: "ghana.md",
    displayName: "Ghana New Testament",
  },
  cote: {
    playlist: "cote-d'ivoire-new-testament",
    license: "cotdivoir.md",
    displayName: "Cote d'Ivoire New Testament",
  },
  togo: {
    playlist: "togo-new-testament",
    license: "togo.md",
    displayName: "Togo New Testament",
  },
  malawi: {
    playlist: "malawi-new-testament",
    license: "malawi.md",
    displayName: "Malawi New Testament",
  },
  cameroon: {
    playlist: "cameroon-new-testament",
    license: "cameroon.md",
    displayName: "Cameroon New Testament",
  },
  tanzania: {
    playlist: "tanzania-new-testament",
    license: "tanzania.md",
    displayName: "Tanzania New Testament",
  },
  drcfrench: {
    playlist: "congo-french-nt",
    license: "congoFrench.md",
    displayName: "Democratic Republic of Congo (French) New Testament",
  },
  drcswahili: {
    playlist: "ase-x-bukavusl",
    license: "bukavu.md",
    displayName: "Democratic Republic of Congo (Swahili) New Testament",
  },
  marathi: {
    playlist: "marathi-nt",
    displayName: "Marathi New Testament",
    license: "marathi.md",
  },
  brazil: {
    playlist: "brazil-nt",
    displayName: "Brazil New Testament",
    license: "brazil.md",
  },
  paraguay: {
    playlist: "pys-nt",
    displayName: "Paraguay New Testament",
    license: "paraguay.md",
  },
  malayalam: {
    playlist: "ins-x-keralasl",
    displayName: "Malayalam New Testament",
    license: "malayalam.md",
  },
} as const;
export default config;
