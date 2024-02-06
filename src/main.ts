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

const contextEl = el("div");
const contextElP = el("div", { class: "root" }, contextEl);
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

document.body.appendChild(contextElP);

document.body.append(inputPEl);

graph.set("0", {
    parents: [],
    children: [],
    posi: { x: 0, y: 0, w: 100, h: 100 },
});
aim.set(inputId, { content: { text: "" }, role: "user" });
setData(inputId);

/** 画布坐标 */
type p_point = { x: number; y: number };
var o_e: MouseEvent;
var o_ab_p: p_point;
var o_rect;
var move: boolean = false;
var select_id = "";
var op = { x: NaN, y: NaN };
/**
 * - 0为全向移动
 * - 1为y
 * - 2为x
 * - 3为锁定
 */
var fxsd: 0 | 1 | 2 | 3 = 0;

initO();

function initO() {
    op = { x: 0, y: 0 };
    contextEl.style.left = "0px";
    contextEl.style.top = "0px";
}

function set_O_p(x: number | null, y: number | null, dx?: number | null, dy?: number | null) {
    if (dx) x = op.x + dx;
    if (dy) y = op.y + dy;
    if (x) {
        dx = x - op.x;
        contextEl.style.left = x + "px";
        op.x = x;
    }
    if (y) {
        dy = y - op.y;
        contextEl.style.top = y + "px";
        op.y = y;
    }
}

contextElP.onwheel = (e) => {
    let dx = 0,
        dy = 0;
    if (e.shiftKey && !e.deltaX) {
        if (fxsd == 0 || fxsd == 2) dx = -e.deltaY;
    } else {
        if (fxsd == 0 || fxsd == 2) dx = -e.deltaX;
        if (fxsd == 0 || fxsd == 1) dy = -e.deltaY;
    }
    requestAnimationFrame(() => {
        set_O_p(null, null, +dx, +dy);
    });
};

/**元素相对位置（屏幕坐标） */
function el_offset(el: Element, pel?: Element) {
    if (!pel) pel = el.parentElement;
    let ox = el.getBoundingClientRect().x - pel.getBoundingClientRect().x,
        oy = el.getBoundingClientRect().y - pel.getBoundingClientRect().y;
    return { x: ox, y: oy, w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height };
}

/** 中键移动画布 */
let middle_b: PointerEvent;
let middle_p = { x: 0, y: 0 };
contextElP.addEventListener("pointerdown", (e) => {
    if (e.button == 1) {
        middle_b = e;
        middle_p.x = el_offset(contextEl).x;
        middle_p.y = el_offset(contextEl).y;
    }
});
document.addEventListener("pointermove", (e) => {
    if (middle_b) {
        let dx = e.clientX - middle_b.clientX,
            dy = e.clientY - middle_b.clientY;
        set_O_p(middle_p.x + dx, middle_p.y + dy);
    }
});
document.addEventListener("pointerup", () => {
    if (middle_b) {
    }
    middle_b = null;
});
