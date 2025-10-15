window.onload = function () {
    const gallery = document.querySelectorAll("img")
    for (const image of gallery) {
        const src = image.getAttribute('src');
        image.addEventListener('click', function () {
            window.open(src);
        });
        image.addEventListener('mouseover', (event) => {
            event.target.style.cursor = "pointer";
        });
    }
};
