async function parseRequest(request) 
{
	if (request.url.startsWith("http://localhost"))
		return;

	browser.tabs
	.query({ active: true, currentWindow: true })
	.then(tabs => 
		{
			for (var i = 0; i < tabs.length; i++)
				browser.tabs.sendMessage(tabs[i].id, { command: "parserequest", request: request });
		}
	)
	.catch(console.error)
	;
}

browser.webRequest.onBeforeRequest.addListener(
	parseRequest,
	{
		urls: [ "<all_urls>" ]
	},
	[ "requestBody" ]
);
