// Dummy data, to be replaced with real metrics.
const LANGUAGES = ["JavaScript", "Python", "Java", "Go", "Rust", "Ruby"];

const DATA = {
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
