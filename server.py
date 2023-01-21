import base64
import json
import re
import requests
import random
import time
import websockets
import asyncio
from threading import Thread
from flask import request, jsonify, Flask
from copy import deepcopy
from flask import request, Flask, jsonify
from PIL import Image


# To run, install all python libraries!

pictures = [(796, 278, 'knight.png')]  # x, y, picture name.
game_url = 'https://ms...'  # Game token for getting map and picture.

check_token = 'NullNull'


colors_rgb = [[255, 255, 255], [209, 213, 222], [163, 172, 190], [103, 112, 139], [78, 83, 113], [57, 58, 86], [38, 36, 58], [20, 16, 32], [123, 207, 92], [80, 155, 75], [46, 106, 66], [26, 69, 59], [15, 39, 56], [13, 47, 109], [15, 77, 163], [14, 130, 206], [19, 178, 242], [65, 243, 252], [
    240, 210, 175], [229, 174, 120], [197, 129, 88], [148, 85, 66], [98, 53, 48], [70, 33, 31], [151, 67, 42], [229, 112, 40], [247, 172, 55], [251, 223, 107], [254, 151, 155], [237, 82, 89], [196, 44, 54], [120, 31, 44], [53, 20, 40], [77, 35, 82], [127, 59, 134], [180, 94, 179], [227, 141, 214]]


def get_best_color(n):
    best, d = colors_rgb[0], 10e10
    for x, y, z in colors_rgb:
        s = abs(x-n[0])**2 + abs(y-n[1])**2 + abs(z-n[2])**2
        if s < d:
            best, d = (x, y, z), s
    return best


def get_our_pixels(x1, y1, picture):
    img = Image.open(picture)
    obj = img.load()
    x, y = img.size
    out = []
    for i in range(x):
        for j in range(y):
            if not obj[i, j][-1]:
                continue
            color = get_best_color(obj[i, j][:3])
            out.append((i+x1, j+y1, color))
    return out


def strange_color_to_rgb(x):
    Blue = x & 255
    Green = (x >> 8) & 255
    Red = (x >> 16) & 255
    return Blue, Green, Red


def RGBTo32bitInt(r, g, b):
    return int('%02x%02x%02x' % (r, g, b), 16)


def prepare_data(data1):
    data = deepcopy(data1)
    for i in range(len(data)):
        data[i] = {'x': data[i][0], 'y': data[i][1],
                   'color': RGBTo32bitInt(*reversed(data[i][2]))}
    return data


def get_picture(cache, url):
    name = 'pixel_pic.png'
    data = requests.get(url)
    with open(name, 'wb') as f:
        f.write(data.content)
    image = Image.open(name)
    image = image.convert('RGBA')
    obj = image.load()
    for i in cache:
        x, y = int(i['x']), int(i['y'])
        if i['color']:
            obj[x, y] = tuple(
                list(strange_color_to_rgb(int(i['color']))) + [255,])
    image.save(name, quality=100)
    return image


def to_draw_picture(cache, x1, y1, url, pic, sort_type):
    img = get_picture(cache, url)
    obj = img.load()
    out = []
    for x, y, color in get_our_pixels(x1, y1, pic):
        if obj[x, y][-1] and obj[x, y][:3] != color:
            out.append((x, y, color))
        elif obj[x, y][:3] == color:
            pass
    if sort_type == 'leftdown':
        out.sort(key=lambda x: x[0]-x[1])
    elif sort_type == 'default':
        random.shuffle(out)
    return out


tasks = []
speed = 0
count = 0
renew_time = 300 // 2


async def ws_listen(url, mes, pattern):
    data = []
    async with websockets.connect(url) as websocket:
        await websocket.send('2probe')
        data.append(await websocket.recv())
        await websocket.send('5')
        data.append(await websocket.recv())
        await websocket.send(mes)
        data.append(await websocket.recv())
        while True:
            for i in data:
                if pattern in i:
                    return i
            data.append(await websocket.recv())


def listen_ws(url, mes, p):
    return asyncio.run(ws_listen(url, mes, p))


def page_work(url, first=True):
    try:
        page = requests.get(url).text
        id = int(re.findall(r"{path: '/mysocket'}\), (\d+),", page)[0])
        token = re.findall(f"{id}, '(\S+)'", page)[0]
        sid = json.loads(requests.get(
            'https://mmosg.ru/mysocket/?EIO=4&transport=polling&t=123', headers={'Referer': url}).text[1:])['sid']
        (requests.post(
            f'https://mmosg.ru/mysocket/?EIO=4&transport=polling&t=124&sid={sid}', data='40', headers={'Referer': url}).text)
        mes = listen_ws(f'wss://mmosg.ru/mysocket/?EIO=4&transport=websocket&sid={sid}', '423["load_canvas_image_and_cache",{"id":'+str(
            id)+',"token":"' + token + '","name":"picture"}]', 'path_to_image')
        mes = json.loads(mes[3:])
        colors = 0  # asyncio.run(get_colors_play(url))
        picture_cache = []
        path = 'https://mmosg.ru' + mes[0]['data']['path_to_image']
        for i in sorted(mes[0]['data']['pixels_cache'].keys()):
            picture_cache += mes[0]['data']['pixels_cache'][i]
        bombs = 0
        return {'id': id, 'token2': token, 'sid': sid, 'colors': colors, 'picture_cache': picture_cache, 'bombs': bombs, 'path': path}
    except Exception as err:
        print("Get page err!", url, err)
        if first:
            for i in range(3):
                try:
                    time.sleep(15)
                    return page_work(url, first=False)
                except:
                    pass
            print("I died...")
            return {"url": url}
        else:
            print("1000-7...")
            1/0


def refresh(a):
    # if time.time() - a['time'] >= 86400:
    #     a['time'] = time.time()
    #     a['url'] = get_url(a)
    data = page_work(a['url'])
    data['url'] = a['url']
    # data['token'] = a['token']
    # data['time'] = a['time']
    return data


def get_task():
    global tasks, count
    if tasks:
        count += 1
        return tasks.pop(0)
    return None


def get_tasks_by_colors(col):
    tasks = [get_task() for _ in range(col)]
    tasks = [i for i in tasks if i]
    return tasks


started_acc = {"url": game_url}


def get_tasks():
    global started_acc
    started_acc = refresh(started_acc)
    res = []
    for pic in pictures:
        res += to_draw_picture(started_acc['picture_cache'],
                               pic[0], pic[1], started_acc['path'], pic[2], (pic[3] if len(pic) > 3 else 'default'))
    return res


# if_session = vk_api.vk_api.VkApiGroup(
#     token="123")
# if_vk = if_session.get_api()


def renew_tasks():
    global tasks, count, speed
    while True:
        try:
            tasks = prepare_data(get_tasks())
            speed = count * 60 / renew_time
            mes = f"Осталось нарисовать {len(tasks)} пикселей. Средняя скорость рисования за последние {renew_time} секунд — {speed} пикс./мин. Осталось {len(tasks)/speed if speed > 0 else (0 if len(tasks) == 0 else 'inf')} мин."
            count = 0
            print(mes)
            # if_vk.messages.send(peer_id=2000000047, message=mes,
            #                     random_id=random.getrandbits(64))
        except Exception as err:
            print("err", err)
        finally:
            time.sleep(renew_time)


thread = Thread(target=renew_tasks, daemon=True)
thread.start()


def write_pb_token(data):  # Implement token saving here if you need...
    token = base64.b64decode(data).decode('utf-8')
    id = re.findall(r'vk_user_id=(.+)&', token)
    if not id:
        return
    id = id[0]
    print(id, token)


app = Flask(__name__)


@app.route("/api/get_drawing_tasks", methods=["POST"])
def api_get_drawing_tasks():
    a = request.get_json()
    print("Draw:", a)
    if "token" in a and a["token"] == check_token:
        if 'colors' not in a:
            return jsonify({'tasks': [], 'error': 'ОБНОВИТЕ СКРИПТ!'})
        return jsonify({'tasks': get_tasks_by_colors(a["colors"])})
    else:
        return "error"


@app.route("/api/report", methods=["POST"])
def api_report():
    a = request.get_json()
    print("Report:", a)
    if "token" in a and a["token"] == check_token:
        if 'data' in a:
            write_pb_token(a['data'])
        return 'ok'
    else:
        return "error"


if __name__ == "__main__":
    app.run(port=80, host='0.0.0.0', debug=False)
