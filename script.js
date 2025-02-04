var filename = document.getElementById("filename");
var dropdown = document.getElementById("dropdown");

document.getElementById("download").addEventListener("click", () => { sendMessage({ command: "download", filename: filename.value, url: dropdown.value }, null); });
document.getElementById("stop").addEventListener("click", () => { sendMessage({ command: "stopall" }, null); });
document.getElementById("refresh").addEventListener("click", () => { refresh(); });

refresh();

function refresh() 
{
	sendMessage({ command: "getsources" }, response => 
		{
			if (response.sources.length == 0)
				return;

			dropdown.replaceChildren(...response.sources.map(function(x) 
				{
					var element = document.createElement("option");
					element.text = x.name;
					element.value = x.url;
					return element;
				}
			));
		}
	);
}

function sendMessage(message, response) 
{
	browser.tabs
	.query({ active: true, currentWindow: true })
	.then(tabs => 
		{
			for (var i = 0; i < tabs.length; i++)
				if (response != null)
					browser.tabs.sendMessage(tabs[i].id, message).then(response);
				else
					browser.tabs.sendMessage(tabs[i].id, message);
		}
	)
	.catch(console.error)
	;
}

browser.tabs.executeScript({ file: "/m3u8-parser/node_modules/m3u8-parser/dist/m3u8-parser.min.js" });
browser.tabs.executeScript({ file: "/download.js" });
