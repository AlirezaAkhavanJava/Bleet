const items = document.querySelectorAll(".nav-item");
items.forEach((item) => {
  item.addEventListener("click", () => {
    const currentActive = document.querySelector(".nav-item.active");
    if (currentActive) {
      currentActive.classList.remove("active");
    }
    item.classList.add("active");
  });
});
