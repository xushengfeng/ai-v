import { el } from "redom";

type aiM = {
    id: string;
    role: "system" | "user" | "ai";
    content: { text: string; image?: { type: string; src: string } };
}[];
let aim: aiM = [];

let inputId = "0";

const contextEl = el("div");
const inputEl = el("textarea");
const imgInputEl = el("input", {
    type: "file",
    onchange: () => {
        const file = imgInputEl.files[0];
        const reader = new FileReader();

        reader.onload = function (event) {
            const imageUrl = event.target.result;
            imgIPreview.src = imageUrl as string;
        };

        reader.readAsDataURL(file);
    },
});
const imgIPreview = el("img");
const inputPEl = el("div", [
    inputEl,
    el("div", [imgInputEl, imgIPreview]),
    el("button", {
        onclick: () => {
            let src = imgIPreview.src;

            const parts = src.split(";base64,");
            const mimeType = parts[0].replace("data:", "");
            const base64Data = parts[1];
            let data: aiM[0] = {
                id: inputId,
                role: "user",
                content: {
                    text: inputEl.value,
                    image: {
                        type: mimeType,
                        src: base64Data,
                    }, // todo ?.
                },
            };
            if (getById(inputId)) {
                for (let d of aim) {
                    if (d.id === inputId) {
                        data.role = d.role;
                        d = data;
                        break;
                    }
                }
            } else {
                aim.push(data);
            }
            setData(inputId);
            inputId = getId();
        },
    }),
]);

function getId() {
    return String(new Date().getTime());
}

function getById(id: string) {
    return aim.find((d) => d.id === id);
}

function setData(id: string) {
    const data = aim[id];
    let textEl = el("div");
    let cardEl = el("div", { "data-id": id }, [
        el("div", [
            el("div", {
                onclick: () => {
                    inputId = data.id;
                    let xdata = getById(inputId);
                    inputEl.value = xdata.content.text;
                    if (xdata.content.image) imgInputEl.src = xdata.content.image.src;
                },
            }),
            el("div", {
                onclick: () => {
                    cardEl.remove();
                    aim = aim.filter((d) => d.id != data.id);
                },
            }),
        ]),
        textEl,
        el("img", data.content.image.src),
    ]);
    let oldEl = contextEl.querySelector(`[data-id="${id}"]`);
    if (oldEl) {
    } else {
        contextEl.append(cardEl);
    }
}

window.addEventListener("message", function (event) {
    const base64Image = event.data;
    imgIPreview.src = base64Image;
});
