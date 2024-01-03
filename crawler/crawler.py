from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
import time

driver = webdriver.Chrome()
driver.get("http://afreehp.kr/page/VZiXlq2ax8bYmqSVwJY")
elem = driver.find_elements(By.CLASS_NAME, "roulette_text")
print(elem)

# Eh.. selenium isn't proper approach i guess