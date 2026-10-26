// Fictional data for the design prototype. Not verified popularity statistics.
const LANGUAGES = ["JavaScript", "Python", "Java", "Go", "Rust", "Ruby"];

const DATA = {
  hiring: {
    label: "Hiring comments",
    values: [186, 241, 98, 124, 67, 42],
  },
  githubRepos: {
    label: "Repositories",
    values: [1200000, 1100000, 900000, 400000, 250000, 300000],
  },
  modules: {
    label: "Modules",
    values: [3000000, 550000, 600000, 1500000, 150000, 180000],
  },
  stackoverflow: {
    label: "Questions",
    values: [2500000, 2200000, 1900000, 75000, 45000, 230000],
  },
  releases: {
    years: [2020, 2021, 2022, 2023, 2024, 2025],
    series: {
      JavaScript: [1, 1, 1, 1, 1, 1],
      Python: [5, 6, 7, 6, 8, 7],
      Java: [2, 2, 2, 2, 2, 2],
      Go: [6, 7, 8, 7, 9, 8],
      Rust: [12, 10, 9, 9, 9, 9],
      Ruby: [4, 5, 4, 5, 6, 5],
    },
  },
};

// Competition ranking: tied values share a rank, with a gap after the tie.
// Rank the complete dataset before applying any presentation filters.
function rankLanguages(metric, year = 2025) {
  const values =
    metric === "releases"
      ? LANGUAGES.map(
          (language) =>
            DATA.releases.series[language][
              DATA.releases.years.indexOf(Number(year))
            ],
        )
      : DATA[metric].values;
  let previousValue;
  let rank;
  return LANGUAGES.map((language, index) => ({
    language,
    value: values[index],
  }))
    .sort((a, b) => b.value - a.value || a.language.localeCompare(b.language))
    .map((row, index) => {
      if (row.value !== previousValue) rank = index + 1;
      previousValue = row.value;
      return { ...row, rank };
    });
}

if (typeof module !== "undefined")
  module.exports = { LANGUAGES, DATA, rankLanguages };
