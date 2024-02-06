import { el, setStyle } from "redom";

type aiM = {
    role: "system" | "user" | "ai";
    content: { text: string; image?: { type: string; src: string } };
};
let aim: Map<string, aiM> = new Map();

type rect = { x: number; y: number; w: number; h: number };
type graphNode = Map<string, { parents: string[]; children: string[]; posi: rect }>;
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
    let oldEl = getCard(id);
    if (oldEl) {
        contextEl.replaceChild(cardEl, oldEl);
    } else {
        contextEl.appendChild(cardEl);
        addHandle(cardEl);
    }
}

function getCard(id: string) {
    return contextEl.querySelector(`[data-id="${id}"]`);
}

function addHandle(i: HTMLElement) {
    let x_h = [];

    for (let i = 0; i < 8; i++) {
        x_h[i] = el("div", { class: `xxhandle${i}` });
    }
    i.append(el("div", { class: "haddle" }, x_h));

    i.onpointerdown = (e) => {
        let el = e.target as HTMLDivElement;
        if (x_h.includes(el)) {
            e.preventDefault();
            e.stopPropagation();
            free_o_a = x_h.indexOf(el);
            free_old_point = e2p(e);
            free_o_rects = graph.get(i.getAttribute("data-id")).posi;
        } else {
            if (e.ctrlKey) {
                free_o_a = -1;
                free_old_point = e2p(e);
                free_o_rects = graph.get(i.getAttribute("data-id")).posi;
            }
        }
    };
}

/** 框有交集 */
function rect_x_rect(rect0: rect, rect1: rect) {
    if (
        rect0.x <= rect1.x + rect1.w &&
        rect0.x + rect0.w >= rect1.x &&
        rect0.y <= rect1.y + rect1.h &&
        rect0.y + rect0.h >= rect1.y
    ) {
        return true;
    } else {
        return false;
    }
}

function reflashNode() {
    let outRect = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
    for (let i of graph) {
        const id = i[0];
        const rect = i[1].posi;
        const _rect = structuredClone(rect);
        _rect.x = rect.x + op.x;
        _rect.y = rect.y + op.y;
        if (rect_x_rect(outRect, rect)) {
            let el = getCard(id);
            if (el) {
                setStyle(el, { left: rect.x + "px", top: rect.y + "px", width: rect.w + "px", height: rect.h + "px" });
            } else {
                setData(id);
            }
        }
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
    reflashNode();
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

let free_old_point: p_point;
/** 所作用的元素及其原始位置大小 */
let free_o_rects: rect;
/** 应该对元素执行的操作，移动还是调节大小 */
let free_o_a = NaN;
/** 是否移动过，可用于判断点击还是拖动 */
let free_move = false;

var changePosiId = "0";

function e2p(e: MouseEvent) {
    return {
        x: e.clientX - el_offset(contextEl, document.body).x,
        y: e.clientY - el_offset(contextEl, document.body).y,
    } as p_point;
}
var MouseEvent = (e: MouseEvent) => {
    if (!free_old_point) return;
    let xel = free_o_rects;
    let np = e2p(e);
    let dx = np.x - free_old_point.x,
        dy = np.y - free_old_point.y;
    let w = xel.w,
        h = xel.h;

    switch (free_o_a) {
        case -1:
            c(-10, dx);
            c(-11, dy);
            break;
        case 0:
            c(0, -dy);
            break;
        case 1:
            c(1, dx);
            break;
        case 2:
            c(2, dy);
            break;
        case 3:
            c(3, -dx);
            break;
        case 4:
            // ↗
            if (e.shiftKey) {
                let j = dx * w - dy * h;
                c(0, (j * h) / (w ** 2 + h ** 2));
                c(1, (j * w) / (w ** 2 + h ** 2));
            } else {
                c(0, -dy);
                c(1, dx);
            }
            break;
        case 5:
            // ↘
            if (e.shiftKey) {
                let j = dx * w + dy * h;
                c(1, (j * w) / (w ** 2 + h ** 2));
                c(2, (j * h) / (w ** 2 + h ** 2));
            } else {
                c(1, dx);
                c(2, dy);
            }
            break;
        case 6:
            // ↙
            if (e.shiftKey) {
                let j = -dx * w + dy * h;
                c(2, (j * h) / (w ** 2 + h ** 2));
                c(3, (j * w) / (w ** 2 + h ** 2));
            } else {
                c(2, dy);
                c(3, -dx);
            }
            break;
        case 7:
            // ↖
            if (e.shiftKey) {
                let j = -dx * w - dy * h;
                c(3, (j * w) / (w ** 2 + h ** 2));
                c(0, (j * h) / (w ** 2 + h ** 2));
            } else {
                c(3, -dx);
                c(0, -dy);
            }
            break;
    }
    function c(a: number, d: number) {
        xel = changePosi(xel, e, dx, dy, a, d);
    }
    graph.get(changePosiId).posi = xel;
    reflashNode();
};

contextElP.addEventListener("pointermove", MouseEvent);
contextElP.addEventListener("pointerup", (e) => {
    free_old_point = null;
    MouseEvent(e);
});

function changePosi(
    xel: { x: number; y: number; w: number; h: number },
    e: MouseEvent,
    dx: number,
    dy: number,
    a: number,
    d: number
) {
    let x = NaN,
        y = NaN,
        w = NaN,
        h = NaN;
    let i = 1,
        j = 0;
    if (e.ctrlKey) {
        i = 2;
        j = 1;
    }
    switch (a) {
        case -10:
            x = xel.x + dx;
            break;
        case -11:
            y = xel.y + dy;
            break;
        case 0:
            y = xel.y - d;
            h = xel.h + i * d;
            break;
        case 1:
            w = xel.w + i * d;
            x = xel.x - j * d;
            break;
        case 2:
            h = xel.h + i * d;
            y = xel.y - j * d;
            break;
        case 3:
            x = xel.x - d;
            w = xel.w + i * d;
            break;
    }
    return {
        x: isNaN(x) ? xel.x : x,
        y: isNaN(y) ? xel.y : y,
        w: isNaN(w) ? xel.w : w,
        h: isNaN(h) ? xel.h : h,
    };
}
