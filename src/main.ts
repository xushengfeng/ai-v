import { el } from "redom";

type aiM = {
    role: "system" | "user" | "ai";
    content: { text: string; image?: { type: string; src: string } };
};
let aim: Map<string, aiM> = new Map();

type graphNode = Map<
    string,
    { parents: string[]; children: string[]; posi: { x: number; y: number; w: number; h: number } }
>;
let graph: graphNode = new Map();

let inputId = "0";

const contextEl = el("div", { class: "root" });
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
const inputPEl = el("div", { class: "input" }, [
    inputEl,
    el("div", [imgInputEl, imgIPreview]),
    el("button", {
        onclick: () => {
            let src = imgIPreview.src;

            const parts = src.split(";base64,");
            const mimeType = parts[0].replace("data:", "");
            const base64Data = parts[1];
            let data: aiM = {
                role: "user",
                content: {
                    text: inputEl.value,
                    image: {
                        type: mimeType,
                        src: base64Data,
                    }, // todo ?.
                },
            };
            aim.set(inputId, data);
            setData(inputId);
            if (graph.get(inputId).children.length === 0) {
                runai(inputId);
            }
        },
    }),
]);

let maxId = 0;

function getId() {
    maxId++;
    const id = String(maxId);
    return id;
}

function setData(id: string) {
    const data = aim.get(id);
    const style = graph.get(id);
    let textEl = el("div");
    textEl.innerText = data.content.text; // todo md
    let cardEl = el(
        "div",
        {
            "data-id": id,
            style: {
                left: style.posi.x + "px",
                top: style.posi.y + "px",
                width: style.posi.w + "px",
                height: style.posi.h + "px",
            },
        },
        [
            el("div", [
                el("div", {
                    onclick: () => {
                        inputId = id;
                        let xdata = aim.get(inputId);
                        inputEl.value = xdata.content.text;
                        if (xdata.content.image) imgInputEl.src = xdata.content.image.src;
                    },
                }),
                el("div", {
                    onclick: () => {
                        cardEl.remove();
                        aim.delete(id);
                        // todo gr
                    },
                }),
            ]),
            textEl,
        ]
    );
    if (data.content.image) cardEl.appendChild(el("img", data.content.image.src));
    let oldEl = contextEl.querySelector(`[data-id="${id}"]`);
    if (oldEl) {
        contextEl.replaceChild(cardEl, oldEl);
    } else {
        contextEl.appendChild(cardEl);
    }
}

function runai(id: string) {
    let m = getAiMess(id);
    console.log(m);
    // run
    let newId = newNode(id);
    aim.set(newId, { content: { text: "hihihi" }, role: "ai" }); // todo
    setData(newId);

    let newinputId = newNode(newId);
    aim.set(newinputId, { content: { text: "" }, role: "user" });
    setData(newinputId);

    inputId = newinputId;
}

function newNode(parent: string) {
    let pData = graph.get(parent);
    let id = getId();

    pData.children.push(id);

    graph.set(id, {
        parents: [parent],
        children: [],
        posi: { x: pData.posi.x, y: pData.posi.y + pData.posi.h, w: 100, h: 100 },
    });

    return id;
}

function getAiMess(id: string) {
    let list: aiM[] = [];
    walk(id);
    function walk(node: string) {
        let data = graph.get(node);
        list.push(aim.get(node));
        for (let p of data.parents) {
            walk(p);
        }
    }
    return list;
}

window["setImg"] = (img: string) => {
    imgIPreview.src = img;
};

document.body.appendChild(contextEl);

document.body.append(inputPEl);

graph.set("0", {
    parents: [],
    children: [],
    posi: { x: 0, y: 0, w: 100, h: 100 },
});
aim.set(inputId, { content: { text: "" }, role: "user" });
setData(inputId);
