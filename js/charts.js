for (const canvas of document.querySelectorAll("canvas[data-metric]")) {
  const metric = canvas.dataset.metric;
  const options = { maintainAspectRatio: false };

  if (metric === "releases") {
    const { years, series } = DATA.releases;
    new Chart(canvas, {
      type: "line",
      data: {
        labels: years,
        datasets: Object.entries(series).map(([label, data]) => ({ label, data })),
      },
      options,
    });
  } else {
    const { label, values } = DATA[metric];
    new Chart(canvas, {
      type: "bar",
      data: { labels: LANGUAGES, datasets: [{ label, data: values }] },
      options: { ...options, plugins: { legend: { display: false } } },
    });
  }
}
