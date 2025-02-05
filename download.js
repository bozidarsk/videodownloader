const REMOTE = "http://localhost:5555";
var running = false;

async function log(message, isjson = true) 
{
	await fetch(`${REMOTE}/log`, 
		{
			method: "POST",
			body: isjson ? JSON.stringify(message).toString() : message,
			headers: { "Content-Type": "text/plain" }
		}
	);
}

async function addSource(url, name = "unnamed") 
{
	var parser = new m3u8Parser.Parser();
	parser.push(await fetch(url).then(x => x.text()));
	parser.end();

	if (parser.manifest.playlists.length != 0 && parser.manifest.segments.length == 0) 
	{
		for (var i = 0; i < parser.manifest.playlists.length; i++) 
		{
			const attributes = parser.manifest.playlists[i].attributes;
			await fetch(`${REMOTE}/addSource?name=${encodeURIComponent(`${name}-${attributes.RESOLUTION.width}x${attributes.RESOLUTION.height}-${attributes.BANDWIDTH}`)}&url=${encodeURIComponent(parser.manifest.playlists[i].uri)}`, { method: "POST" });
		}

		return;
	}

	if (parser.manifest.playlists.length == 0 && parser.manifest.segments.length != 0) 
	{
		await fetch(`${REMOTE}/addSource?name=${encodeURIComponent(name)}&url=${encodeURIComponent(url)}`, { method: "POST" });
	}
}

async function getSources() 
{
	return await fetch(`${REMOTE}/getSources`, { method: "POST" }).then(x => x.json());
}

async function downloadMovie(name, url) 
{
	running = true;

	var parts = await fetch(url).then(x => x.text()).then(x => x.split("\n")).then(x => x.filter(line => line.startsWith("https")));
	var encodedName = encodeURIComponent(name);

	for (var i = 0; i < parts.length && running; i++) 
	{
		await fetch(`${REMOTE}/save?filename=${encodedName}&index=${i}`, 
			{
				method: "POST",
				body: await fetch(parts[i]).then(x => x.blob()),
				headers: { "Content-Type": "application/octet-stream" }
			}
		);
	}

	await fetch(`${REMOTE}/finalize?filename=${encodedName}&count=${encodeURIComponent(parts.length)}`, { method: "POST" });
}

browser.runtime.onMessage.addListener(async (message) => 
	{
		switch (message.command) 
		{
			case "download":
				running = true;
				await downloadMovie(message.filename, message.url);
				break;
			case "stopall":
				running = false;
				log("Stopping.", false);
				break;
			case "getsources":
				return Promise.resolve({ sources: await getSources() });
			case "parserequest":
				if (
					message.request.originUrl !== undefined
					&& message.request.tabId !== -1
					&& message.request.parentFrameId !== -1
					&& (message.request.url.endsWith(".m3u8") || message.request.url.endsWith(".m3u"))
				) 
				{
					await addSource(message.request.url);
				}
				break;
			default:
				log("Invalid message '" + JSON.stringify(message).toString() + "'.", false);
				break;
		}
	}
);
