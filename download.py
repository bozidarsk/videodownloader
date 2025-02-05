#!/bin/python3

from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
from collections import namedtuple
from json import dumps
from os.path import isfile
from os import remove

sources = {} # Dictionary<string, string> - Dictionary<url, name>

def getPartFilename(filename, index):
	return f".{filename.encode("utf-8").hex()}.part{index}"

def save(filename, index, data, count):
	print(f"Downloading '{filename}' - {int((index / count) * 100)}%.")

	with open(getPartFilename(filename, index), "wb") as file:
		file.write(data)

def finalize(filename, count):
	if isfile(filename):
		return -1

	with open(filename, "ab") as dest:
		for i in range(count):
			name = getPartFilename(filename, i)

			if not isfile(name):
				return i

			with open(name, "rb") as src:
				dest.write(src.read())

			remove(name)

	print(f"Downloaded '{filename}'.")
	return -1

def remapSourceDictionary(dic):
	return [{ "url": u, "name": n } for u, n in dic.items()]

class Server(BaseHTTPRequestHandler):
	def log_message(self, format, *args):
		return

	def do_OPTIONS(self):
		self.send_response(200)
		self.send_header("Allow", "POST")
		self.send_header("Access-Control-Allow-Origin", "*")
		self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
		self.send_header("Access-Control-Allow-Headers", "Content-Type")
		self.end_headers()

	# self.path == /{save|finalize|log|addSource|getSources}[?[file]name=[FILE]NAME[&url=URL][&index=INDEX][&count=COUNT]]
	def do_POST(self):
		url = urlparse(self.path)
		query = parse_qs(url.query)
		print(self.path)

		match url.path:
			case "/save":
				filename = query.get("filename")
				index = query.get("index")
				count = query.get("count")

				if (not filename[0]):
					self.error_response(f"Invalid filename. ('{filename[0]}')")
					return
				if (not index[0]):
					self.error_response(f"Invalid index. ('{index[0]}')")
					return
				if (not count[0]):
					self.error_response(f"Invalid count. ('{count[0]}')")
					return

				save(filename[0], int(index[0]), self.rfile.read(int(self.headers["Content-Length"])), int(count[0]))
			case "/finalize":
				filename = query.get("filename")
				count = query.get("count")

				if (not filename[0]):
					self.error_response(f"Invalid filename. ('{filename[0]}')")
					return
				if (not count[0]):
					self.error_response(f"Invalid count. ('{count[0]}')")
					return

				result = finalize(filename[0], int(count[0]))

				if (result != -1):
					self.error_response(f"Missing part '{result}' for '{filename[0]}'.")
					# TODO: request the missing part and when 'Stop all' button is pressed cancel all request missing part requests
					return
			case "/log":
				print(self.rfile.read(int(self.headers["Content-Length"])))
			case "/addSource":
				name = query.get("name")
				url = query.get("url")

				if (not name[0]):
					self.error_response(f"Invalid name. ('{name[0]}')")
					return
				if (not url[0]):
					self.error_response(f"Invalid url. ('{url[0]}')")
					return

				sources[url[0]] = name[0]
			case "/getSources":
				json = dumps(remapSourceDictionary(sources))
				self.finalize_response(200)
				self.wfile.write(json.encode())
				return
			case _:
				self.error_response(f"Invalid url path. ('{url.path}')")
				return

		self.finalize_response(200)

	def finalize_response(self, code):
		self.send_response(code)
		self.send_header("Access-Control-Allow-Origin", "*")
		self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
		self.send_header("Access-Control-Allow-Headers", "Content-Type")
		self.end_headers()

	def error_response(self, message):
		self.finalize_response(400)
		print(message)

server = HTTPServer(("localhost", 5555), Server)
server.serve_forever()
