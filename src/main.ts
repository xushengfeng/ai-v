import { el, setStyle } from "redom";
import localforage from "localforage";

type aiM = {
    role: "system" | "user" | "ai";
    content: { text: string; image?: { type: string; src: string; base64: string } };
};
let aim: Map<string, aiM> = new Map();
type chatgptm = {
    role: "system" | "user" | "assistant";
    content: string | [{ type: "text"; text: string }, { type: "image_url"; image_url: { url: string } }];
}[];
type geminim = {
    parts: [
        { text: string },
        {
            inline_data: {
                mime_type: string;
                data: string;
            };
        }?
    ];
    role: "user" | "model";
}[];
type aiconfig = { type: "chatgpt" | "gemini"; key?: string; url?: string; option?: Object };

const setting = localforage.createInstance({
    name: "setting",
    driver: localforage.LOCALSTORAGE,
});

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
                },
            };
            if (base64Data)
                data.content["image"] = {
                    type: mimeType,
                    src: src,
                    base64: base64Data,
                };
            aim.set(inputId, data);
            setData(inputId);
            inputEl.value = "";
            imgIPreview.src = "";
            if (graph.get(inputId).children.length === 0) {
                runai(inputId);
            }
        },
    }),
]);

const buttons = el("div", { class: "buttons" }, [
    el(
        "button",
        {
            onclick: () => {
                settingEl.showPopover();
            },
        },
        ["setting"]
    ),
    el(
        "button",
        {
            onclick: () => {
                historyEl.showPopover();
            },
        },
        ["history"]
    ),
]);

const aiConfigEl = el("div");
const settingEl = el("div", { popover: "auto" }, [el("h1", "设置"), el("div", [el("h2", "AI"), aiConfigEl])]);
const historyEl = el("div", { popover: "auto" }, [el("h1", "历史记录")]);

settingEl.oninput = (e) => setSetting(e);

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
                width: style.posi.w ? style.posi.w + "px" : "auto",
                height: style.posi.h ? style.posi.h + "px" : "auto",
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
    if (data.content.image) cardEl.appendChild(el("img", { src: data.content.image.src }));
    let oldEl = getCard(id);
    if (oldEl) {
        contextEl.replaceChild(cardEl, oldEl);
    } else {
        contextEl.appendChild(cardEl);
    }
}

function getCard(id: string) {
    return contextEl.querySelector(`[data-id="${id}"]`);
}

async function runai(id: string) {
    let m = getAiMess(id);
    console.log(m);
    // run
    const aix = ai(m, await getAiConfig("default"));
    const text = await aix.text;
    let newId = newNode(id);
    aim.set(newId, { content: { text: text }, role: "ai" });
    setData(newId);

    let newinputId = newNode(newId);
    aim.set(newinputId, { content: { text: "" }, role: "user" });
    setData(newinputId);

    inputId = newinputId;
}

function ai(m: aiM[], config: aiconfig) {
    let chatgpt = {
        url: config.url || `https://api.openai.com/v1/chat/completions`,
        headers: {
            "content-type": "application/json",
        },
        config: {
            model: "gpt-3.5-turbo",
        },
    };
    let gemini = {
        url: config.url || "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
        headers: { "content-type": "application/json" },
        config: {},
    };
    if (!config.type) config.type = "chatgpt";
    let url = "";
    let headers = {};
    let con = {};
    if (config.type === "chatgpt") {
        url = chatgpt.url;
        headers = chatgpt.headers;
        if (config.key) headers["Authorization"] = `Bearer ${config.key}`;
        for (let i in config.option) {
            con[i] = config.option[i];
        }
        let messages: chatgptm = [];
        const roleMap: { system: "system"; ai: "assistant"; user: "user" } = {
            system: "system",
            ai: "assistant",
            user: "user",
        };
        for (let i of m) {
            if (i.content.image) {
                const content: chatgptm[0]["content"] = [
                    { type: "text", text: i.content.text },
                    { type: "image_url", image_url: { url: i.content.image.src } },
                ];
                messages.push({ role: roleMap[i.role], content: content });
            } else messages.push({ role: roleMap[i.role], content: i.content.text });
        }
        con["messages"] = messages;
    }
    if (config.type === "gemini") {
        let newurl = new URL(gemini.url);
        if (config.key) newurl.searchParams.set("key", config.key);
        url = newurl.toString();
        for (let i in config.option) {
            con[i] = config.option[i];
        }
        let geminiPrompt: geminim = [];
        for (let i of m) {
            let role: (typeof geminiPrompt)[0]["role"];
            if (i.role === "system" || i.role === "user") role = "user";
            else role = "model";
            const parts: geminim[0]["parts"] = [{ text: i.content.text }];
            if (i.content.image)
                parts.push({ inline_data: { mime_type: i.content.image.type, data: i.content.image.base64 } });
            geminiPrompt.push({ parts: parts, role });
        }
        con["contents"] = geminiPrompt;
    }
    console.log(url);

    let abort = new AbortController();
    return {
        stop: abort,
        text: new Promise(async (re: (text: string) => void, rj: (err: Error) => void) => {
            fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(con),
                signal: abort.signal,
            })
                .then((v) => {
                    return v.json();
                })
                .then((t) => {
                    if (config.type === "chatgpt") {
                        let answer = t.choices[0].message.content;
                        re(answer);
                    } else {
                        let answer = t.candidates[0].content.parts[0].text;
                        re(answer);
                    }
                })
                .catch((e) => {
                    if (e.name === "AbortError") {
                        return;
                    } else {
                        rj(e);
                    }
                });
        }),
    };
}

function newNode(parent: string) {
    let pData = graph.get(parent);
    let id = getId();

    pData.children.push(id);

    graph.set(id, {
        parents: [parent],
        children: [],
        posi: { x: pData.posi.x, y: pData.posi.y + pData.posi.h, w: 400, h: 0 },
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
    return list.toReversed();
}

window["setImg"] = (img: string) => {
    imgIPreview.src = img;
};

document.body.append(buttons, settingEl, historyEl);

getSetting();

aiConfigEl.replaceWith(getAiConfigEl("default"));

document.body.appendChild(contextElP);

document.body.append(inputPEl);

graph.set("0", {
    parents: [],
    children: [],
    posi: { x: 0, y: 0, w: 400, h: 0 },
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

function getSetting() {
    settingEl.querySelectorAll("[data-path]").forEach(async (el: HTMLElement) => {
        const path = el.getAttribute("data-path");
        let value = await setting.getItem(path);
        if (el.tagName === "INPUT") {
            let iel = el as HTMLInputElement;
            if (iel.type === "checkbox") {
                iel.checked = value as boolean;
            } else if (iel.type === "range") {
                iel.value = value as string;
            } else {
                iel.value = value as string;
            }
        } else if (el.tagName === "SELECT") {
            (el as HTMLSelectElement).value = value as string;
        }
    });
}

function setSetting(e: Event) {
    const el = e.target as HTMLInputElement;
    if (el.getAttribute("data-path") === null) return;
    let value: string | number = el.value;
    if (el.type === "number") value = Number(value);
    setting.setItem(el.getAttribute("data-path") as string, value);
}

function getAiConfigEl(mainKey: string) {
    mainKey = "ai." + mainKey;
    return el("div", [
        el("label", "type", [
            el("select", { "data-path": `${mainKey}.type` }, [
                el("option", "chatgpt", { value: "chatgpt" }),
                el("option", "gemini", { value: "gemini" }),
            ]),
        ]),
        el("label", "url", el("input", { "data-path": `${mainKey}.url` }, { type: "text" })),
        el("label", "Key", [el("input", { "data-path": `${mainKey}.key` }, { type: "password" })]),
        el("textarea", { "data-path": `${mainKey}.config` }),
    ]);
}

async function getAiConfig(mainKey: string) {
    mainKey = "ai." + mainKey;
    const type = await setting.getItem(`${mainKey}.type`);
    const url = await setting.getItem(`${mainKey}.url`);
    const key = await setting.getItem(`${mainKey}.key`);
    const config = await setting.getItem(`${mainKey}.config`);
    return { type, url, key, config } as aiconfig;
}
