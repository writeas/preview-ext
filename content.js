(function() {
	var pad = document.querySelector("textarea#writer");
	var previewOverlay = document.createElement("div");
	previewOverlay.id = "md-preview";
	previewOverlay.style.cssText = "position: absolute; top: 0; left: 0; z-index: 1000; width: 100%; min-height: 100%; background-color: #fff;";
	var previewModal = document.createElement("div");
	previewModal.style.cssText = "box-shadow: 0 0 16px #000; margin: 20px; padding: 20px;";
	previewOverlay.appendChild(previewModal);
	var previewModalClose = document.createElement("button");
	previewModalClose.id = "md-preview-close";
	previewModalClose.innerText = "Close";
	previewModalClose.title = "Close preview overlay and return to editing"
	previewModalClose.style.cssText = "font-size: 1.6em; position: absolute; z-index: 1010; top: 40px; right: 40px; padding: 2px 8px; font-weight: bold; background-color: #fff; border: 2px solid #989898; color: #989898;"
	previewModalClose.addEventListener('click', () => {
		chrome.runtime.sendMessage({toggle: true});
	});
	previewModal.appendChild(previewModalClose);

	// create and assemble the header
	var previewHeader = document.createElement("header");
	var previewHeading = document.createElement("h1");
	previewHeading.id = "blog-title";
	var previewHeadingLink = document.createElement("a");
	previewHeadingLink.innerText = "Preview";
	previewHeading.appendChild(previewHeadingLink);
	previewHeader.appendChild(previewHeading);
	var previewHeaderNav = document.createElement("nav");
	var previewHeaderNavBack = document.createElement("a");
	previewHeaderNavBack.classList = ['xtra-feature'];
	previewHeaderNavBack.innerText = "Back to Edit";
	previewHeaderNavBack.style.cursor = "pointer";
	previewHeaderNavBack.addEventListener('click', () => {
		chrome.runtime.sendMessage({toggle: true});
	});
	previewHeaderNav.appendChild(previewHeaderNavBack);
	previewHeader.appendChild(previewHeaderNav);
	// create and assemble preview article body
	var previewArticle = document.createElement("article");
	previewArticle.id ="post-body";
	previewArticle.classList = ['norm'];

	// create and assemble preview footer
	var previewFooter = document.createElement("footer");
	var previewFooterHr = document.createElement("hr");
	previewFooter.appendChild(previewFooterHr);
	var previewFooterNav = document.createElement("nav");
	var previewFooterNavP = document.createElement("p");
	previewFooterNavP.style.cssText = "font-size: 0.9em;";
	previewFooterNavP.innerText = "previewed with ";
	previewFooterNav.appendChild(previewFooterNavP);
	var previewFooterNavLink = document.createElement("a");
	previewFooterNavLink.innerText = "view.as";
	previewFooterNavLink.style.cssText = "color: #999;";
	previewFooterNavP.appendChild(previewFooterNavLink);
	previewFooter.appendChild(previewFooterNav);

	// assemble the whole preview modal
	previewModal.appendChild(previewHeader);
	previewModal.appendChild(previewArticle);
	previewModal.appendChild(previewFooter);

	async function showPreview() {
		var scroll = pad.scrollTop / pad.scrollHeight;
		var rawPost = getRawPost();
		var result = await getPostMarkdown(rawPost)
			.then((res) => {
				return res.json();
			});
		previewArticle.innerHTML = result.body;
		previewArticle.classList = [getPostFont()];
		document.body.appendChild(previewOverlay);
		document.body.id = "post";
		pad.style.display = "none";
		window.scrollTo(0,(previewOverlay.offsetHeight*scroll) - 40);
		window.history.pushState({'preview': true},null,'#preview')
	}

	function getRawPost() {
		// TODO: add other possible, i.e. submit.as
		// writefreely pad
		// body#pad textarea#writer
		return pad.value;
	}

	function getPostFont() {
		// assumes only one class as in templates/pad.tmpl
		return pad.classList[0]
	}

	function getPostMarkdown(rawpost) {
		const endpoint = "https://pencil.writefree.ly/api/generate/markdownify";
		var data = {
			base_url: '',
			raw_body: rawpost
		};
		return new Promise((resolve, reject) => {
			chrome.runtime.sendMessage({endpoint, data}, messageResponse => {
				const [response, error] = messageResponse;
				if (response === null) {
					reject(error);
				} else {
					// Use undefined on a 204 - No Content
					const body = response.body ? new Blob([response.body]) : undefined;
					resolve(new Response(body, {
						status: response.status,
						statusText: response.statusText,
					}));
				}
			});
		});
	}

	function clearPreview() {
		var scroll = window.scrollY / previewOverlay.scrollHeight;
		document.body.id = "pad";
		pad.style.display = "block";
		document.body.removeChild(previewOverlay);
		pad.scrollTo(0, (pad.scrollHeight*scroll) + 40);
	}

	function isPreview() {
		return document.body.contains(previewOverlay);
	}

	function isSupported() {
		return (document.querySelector("textarea#writer") !== null);
	}

	// TODO: sender is never used
	chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
		if (msg.preview === true) {
			if (isPreview()) {
				sendResponse({preview: true});
			} else {
				// we send false because when this message was sent,
				// the preview was not active
				showPreview();
				sendResponse({preview: false});
			}
		} else if (msg.preview === false) {
			if (window.location.hash === "#preview") {
				window.history.back();
			};
			sendResponse({preview: false});
		} else if (msg.state === true) {
			sendResponse({supported: isSupported(), preview: isPreview()});
		} else {
			sendResponse({preview: false});
		}
	});
	document.onkeyup = function(e){
		if (e.key === "Escape" && isPreview()) {
			chrome.runtime.sendMessage({toggle: true});
		}
	};

	window.onpopstate = (e) => {
		clearPreview();
	};
})();

