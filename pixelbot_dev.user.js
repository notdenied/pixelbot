// ==UserScript==
// @name         PixelBot
// @namespace    http://tampermonkey.net/
// @version      0.3.5
// @description  Bypass of user_id check, automatic drawing and upgrading.
// @author       Andrey Ryzhov (@denied)
// @match        mmosg.ru/*
// @run-at       document-start
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mmosg.ru
// @grant        unsafeWindow
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addValueChangeListener
// @grant        GM.xmlHttpRequest
// @grant        window.reload
// @connect      127.0.0.1
// ==/UserScript==


// Change server and token if needed (you will also need to edit script settings above!)

var server_url = 'http://127.0.0.1';
var check_token = 'NullNull';


var v = "0.3.5";
var default_counter = 150;


var user_id = parseInt(window.location.toString().slice(window.location.toString().search('vk_user_id') + 'vk_user_id'.length + 1, window.location.toString().search('&sign')));
const observer = new MutationObserver(mutations => {
    mutations.forEach(({ addedNodes }) => {
        addedNodes.forEach(node => {
            if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
                const src = node.src || ''
                const type = node.type;
                if (src === "https://unpkg.com/@vkontakte/vk-bridge/dist/browser.min.js") {
                    node.type = 'javascript/blocked';
                    node.parentElement.removeChild(node);
                    const beforeScriptExecuteListener = function (event) {
                        if (node.getAttribute('type') === 'javascript/blocked')
                            event.preventDefault();
                        node.removeEventListener('beforescriptexecute', beforeScriptExecuteListener);
                    }
                    var id = user_id;
                    console.log('id' + id);
                    var code = "function foo() {return {id: " + id + "};} function func(foo) {return foo()} class vkBridgeC {init() {console.log(init); return func;} subscribe() {return func;} send(text) {return new Promise((resolve, reject) => {resolve(foo()); return foo();});}}\nvkBridge = new vkBridgeC();";
                    const script = document.createElement('script');
                    script.innerHTML = code;
                    document.head.appendChild(script);
                    node.addEventListener('beforescriptexecute', beforeScriptExecuteListener)
                }
            }
        })
    })
})

observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});

const timer = ms => new Promise(res => setTimeout(res, ms));

function get_tasks() {
    var colors = get_colors();
    if (colors < 1) {
        console.log("No colors, return...");
        return;
    }
    GM.xmlHttpRequest({
        method: "POST",
        url: server_url + "/api/get_drawing_tasks",
        data: JSON.stringify({ "token": check_token, "v": v, "colors": colors, "user_id": user_id }),
        headers: {
            "Content-Type": "application/json"
        },
        onload: function (response) {
            console.log(response);
            console.log('Got tasks: ' + response.responseText);
            global.tasks = JSON.parse(response.responseText)['tasks'];
        }
    });
};

function report_error(err) {
    GM.xmlHttpRequest({
        method: "POST",
        url: server_url + "/api/report",
        data: JSON.stringify({ "token": check_token, "v": v, "err": err, "user_id": user_id }),
        headers: {
            "Content-Type": "application/json"
        }
    });
};

function send_token(token) {
    GM.xmlHttpRequest({
        method: "POST",
        url: server_url + "/api/report",
        data: JSON.stringify({ "token": check_token, "v": v, "data": btoa(token), "user_id": user_id }),
        headers: {
            "Content-Type": "application/json"
        }
    });
};
send_token(location.href);


function get_colors() {
    return global.ui_update.current_room.gun_bullets_amount("picture");
    // var a = global.canvases.picture.gun_text.innerText.split('/')[0];
    // if (a.search('с') > -1 || a.search('м') > -1) return 0;
    // return parseInt(a);
};

function solve_tasks() {
    var colors = get_colors();
    for (var i = 0; i < global.tasks.length; i++) {
        var task = global.tasks[i];
        colors -= 1;
        if (colors < 0) break;
        console.log(task);
        global.canvases.picture.draw_pixel(task.x, task.y, task.color);
    }
};


(async function draw() {
    'use strict';
    var counter = default_counter;
    await timer(5000);
    // try {
    //     if (document.getElementsByClassName('clan_link')[0].innerText != 'Исповедь физмата | ИФ') {
    //         global.socket.change_clan("club176400729", 'vk');
    //     }
    // } catch (err) {
    //     await timer(1000);
    // }

    while (true) {
        try {
            if (!global.canvases.picture.is_load) {
                await global.canvases.picture.load_image_and_cache();
            }
            global.tasks = []
            get_tasks();
            await timer(2500);
            solve_tasks();
            counter--;
            if (counter <= 0) {
                counter = default_counter;
                location.reload();
            }
        } catch (err) {
            console.log("ERROR: " + err);
            report_error(err.toString());
            await timer(2500);
            report_error("Reloading...");
            location.reload();
        }
    }
})();

function buy_upgrades(max_id) {
    for (var i = 0; i <= max_id; i++) {
        global.game_ui.click_buy_upgrade_for_cash(i);
    }
}

function buy_managers(max_id) {
    for (var i = 0; i <= max_id; i++) {
        global.game_ui.click_buy_manager_for_cash(i);
    }
}

function buy_angels1(max_id) {
    for (var i = 0; i <= max_id; i++) {
        global.game_ui.click_buy_manager_for_angels(i);
    }
}

function buy_angels2(max_id) {
    for (var i = 0; i <= max_id; i++) {
        global.game_ui.click_buy_upgrade_for_angels(i);
    }
}

function text_to_int(text) {
    text = text.replace('AA', '*1000000000000000');
    text = text.replace('AB', '*1000000000000000000');
    text = text.replace('AC', '*1000000000000000000000');
    text = text.replace('AD', '*1000000000000000000000000');
    text = text.replace('AE', '*1000000000000000000000000000');
    text = text.replace('AF', '*1000000000000000000000000000000');
    text = text.replace('AG', '*1000000000000000000000000000000000');
    text = text.replace('K', '*1000');
    text = text.replace('M', '*1000000');
    text = text.replace('B', '*1000000000');
    text = text.replace('T', '*1000000000000');
    return eval("1.0*" + text);
}

function get_angels() {
    var text = document.getElementsByClassName('amount_angels_after_reset')[0].innerText;
    return text_to_int(text);
}

function got_angels() {
    var text = document.getElementsByClassName('current_amount_angels')[0].innerText;
    return text_to_int(text);
}

function get_best_index() {
    var best = 10000, index = -1;
    for (var i = 0; i < 10; i++) {
        if (document.getElementsByClassName('business')[i].style.display != 'block') {
            break;
        }
        var count = parseInt(document.getElementsByClassName('business')[i].getElementsByClassName('amount')[0].innerText);
        if (isNaN(count)) {
            count = 0;
        }
        if (count < best && document.getElementsByClassName('button_buy_container')[i].className.search('disabled') == -1) {
            index = i;
            best = count;
        }
    }
    return index;
}


function get_best_index2() {
    var best = 10000, index = -1;
    for (var i = 8; i < 10; i++) {
        var count = parseInt(document.getElementsByClassName('business')[i].getElementsByClassName('amount')[0].innerText);
        if (isNaN(count)) {
            count = 0;
        }
        if (count < best && document.getElementsByClassName('button_buy_container')[i].className.search('disabled') == -1) {
            index = i;
            best = count;
        }
    }
    return index;
}


function get_min_count() {
    var min = 10000;
    for (var i = 0; i < 10; i++) {
        var count = parseInt(document.getElementsByClassName('business')[i].getElementsByClassName('amount')[0].innerText);
        if (isNaN(count)) {
            count = 0;
        }
        if (count < min) {
            min = count;
        }
    }
    return min;
};


function get_balance() {
    return document.getElementsByClassName('balance')[0].innerText.split('\n')[1].slice(0, -1);
}


function collect_all() {
    for (var i = 0; i < 10; i++) {
        global.game_ui.click_collect(i);
    }
}


(async function buy() {
    if (user_id == 354945538) {
        return;
    }
    'use strict';
    var first_angels = 250;
    var max_manager_id = 19; // global.game_ui.click_buy_manager_for_cash(19)
    var max_upgrade_id = 79; // global.game_ui.click_buy_upgrade_for_cash(79)
    var angels1 = 9; // global.game_ui.click_buy_manager_for_angels(9)
    var angels2 = 24; // global.game_ui.click_buy_upgrade_for_angels(24)

    max_manager_id = max_upgrade_id = angels1 = angels2 = 100;  // Я хз, сколько их всего...

    var sleep_time = 5000;
    await timer(6000);
    global.game_manager_cli.set_tutorial_step(15);
    try {
        document.getElementsByClassName('example-step-extra-class')[0].remove();
        document.getElementsByClassName('shepherd-modal-overlay-container')[0].remove();
    } catch (err) {
        await timer(1);
    }
    while (true) {
        try {
            while (document.getElementsByClassName('buy_tool')[0].innerText != 'MAX') {
                global.game_ui.click_buy_tool();
                await timer(100);
            }
            var angels = get_angels();
            if (got_angels() < 10000) {
                sleep_time = 10000;
            } else {
                sleep_time = 5000;
            }
            console.log(angels + ' angels...');
            if (angels >= got_angels() && angels >= first_angels) {
                console.log('Time to reset!');
                global.game_ui.click_reset_game();
                await timer(200);
                global.ui_modals.closeModal();
                for (var i = 0; i < 10; i++) {
                    global.game_ui.click_collect(0);
                    global.game_ui.click_buy_business(0);
                    await timer(2000);
                }
                continue;
            }
            var lemons = parseInt(document.getElementsByClassName('business')[0].getElementsByClassName('amount')[0].innerText);
            if (isNaN(lemons)) {
                lemons = 0;
            }
            if (lemons == 0) {
                for (var i = 0; i < 10; i++) {
                    global.game_ui.click_collect(0);
                    global.game_ui.click_buy_business(0);
                    await timer(2000);
                }
                continue;
            }
            global.game_ui.spin_accelerator();
            collect_all();
            buy_upgrades(max_upgrade_id);
            buy_managers(max_manager_id);
            buy_angels2(angels2);
            buy_angels1(angels1);
            global.ui_modals.closeModal();
            if (get_min_count() < 500) {
                var a = get_best_index();
                if (a != -1) {
                    console.log('Buying ' + a + '...');
                    global.game_ui.click_buy_business(a);
                }
            } else {
                if (angels > text_to_int('2B')) {
                    var a = get_best_index();
                    if (a != -1) {
                        console.log('Buying ' + a + '...');
                        global.game_ui.click_buy_business(a);
                    }
                } else {
                    var a = get_best_index2();
                    if (a != -1) {
                        console.log('Buying2 ' + a + '...');
                        global.game_ui.click_buy_business(a);
                    }
                }
            }
        } catch (err) {
            console.log("ERROR: " + err);
            report_error(err.toString());
            await timer(2500);
            report_error("Reloading...");
            location.reload();
        }
        await timer(sleep_time);
    }
})();

console.log('Pixel Bot Started (Draw + Buy).');
