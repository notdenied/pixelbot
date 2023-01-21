import webbrowser
import re
import time
import os
import random

with open('tokens.txt', 'r', encoding='utf-8') as f:
    data = str(f.read())

urls = re.findall(r'(https://\S+)\s', data)
random.shuffle(urls)

for i in urls:
    webbrowser.open(i)
    time.sleep(3)
    # os.system("taskkill /im chrome.exe /f")
