

document.addEventListener("DOMContentLoaded", () => {
    const div = document.createElement("div");
    div.style.backgroundColor = "#474747";
    div.style.width = "100%";
    div.style.height = "100vh";
    div.style.display = "flex";
    div.style.flexDirection = "column";
    div.style.justifyContent = "center";
    div.style.alignItems = "center";
    document.body.style.margin = "0";
    document.body.appendChild(div);

    const imageContainer = document.createElement("div");
    imageContainer.style.position = "relative";
    imageContainer.style.width = "80%";
    imageContainer.style.height = "80%";
    imageContainer.style.overflow = "hidden";
    div.appendChild(imageContainer);

    const image1 = document.createElement("img");
    image1.src = "../images/photo_2025-02-22_19-35-03.jpg";
    image1.style.position = "absolute";
    image1.style.top = "0";
    image1.style.left = "0";
    image1.style.width = "100%";
    image1.style.height = "100%";
    image1.style.objectFit = "contain";
    image1.style.transition = "opacity 2s ease";
    image1.style.opacity = "1";
    imageContainer.appendChild(image1);

    const image2 = document.createElement("img");
    image2.src = "../images/photo_2025-02-22_19-39-34.jpg";
    image2.style.position = "absolute";
    image2.style.top = "0";
    image2.style.left = "0";
    image2.style.width = "100%";
    image2.style.height = "100%";
    image2.style.objectFit = "contain";
    image2.style.transition = "opacity 2s ease";
    image2.style.opacity = "0";
    imageContainer.appendChild(image2);

    const gif = document.createElement("img");
    gif.src = "../images/222.gif";
    gif.style.height = "30%";
    gif.style.width = "30%";
    gif.style.objectFit = "contain";
    gif.style.opacity = "1";
    gif.style.position = "relative";
    div.appendChild(gif);

    let showFirst = true;
    setInterval(() => {
        if (showFirst) {
            image1.style.opacity = "0";
            image2.style.opacity = "1";
        } else {
            image1.style.opacity = "1";
            image2.style.opacity = "0";
        }
        showFirst = !showFirst;
    }, 5000); // 5 сек
});
