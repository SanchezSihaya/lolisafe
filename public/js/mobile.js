var panel = {};

panel.isPrivate = true;
panel.username;
panel.token = localStorage.token;
panel.maxFileSize;
// add the album var to the upload so we can store the album id in there
panel.album;
panel.myDropzone;

panel.checkIfPublic = function(){
	axios.get('/api/check')
  	.then(function (response) {
    	panel.isPrivate= response.data.private;
		panel.maxFileSize = response.data.maxFileSize;
		panel.preparePage();
  	})
  	.catch(function (error) {
  		swal("An error ocurred Line 0 - 21", 'There was an error with the request, please check the console for more information.', "error");
    	return console.log(error);
  	});
}

panel.preparePage = function(){
	if(!panel.isPrivate) return panel.prepareUpload();
	if(!panel.token) return document.getElementById('loginToUpload').style.display = 'inline-flex';

	panel.verifyToken(panel.token, true);
}

panel.verifyToken = function(token, reloadOnError){
	if(reloadOnError === undefined)
		reloadOnError = false;
	
	axios.post('/api/tokens/verify', {
		token: token
	})
  	.then(function (response) {

    	if(response.data.success === false){
    		swal({
				title: "An error ocurred Line 23 - 40", 
				text: response.data.description, 
				type: "error"
			}, function(){
				if(reloadOnError){
					localStorage.removeItem("token");
					location.reload();
				}
			})
			return;
    	}

    	localStorage.token = token;
		panel.token = token;
		panel.username = response.data.username;
		return panel.prepareUpload();

  	})
  	.catch(function (error) {
  		swal("An error ocurred Line 23 - 62", 'There was an error with the request, please check the console for more information.', "error");
    	return console.log(error);
  	});

}

panel.prepareUpload = function(){
	// I think this fits best here because we need to check for a valid token before we can get the albums
	if (panel.token) {
		var select = document.getElementById('albumSelect');
		
		select.addEventListener('change', function() {
			panel.album = select.value;
		});

		axios.get('/api/albums', { headers: { token: panel.token }})
		.then(function(res) {
			var albums = res.data.albums;
			
			// if the user doesn't have any albums we don't really need to display
			// an album selection
			if (albums.length === 0) return;
			
			// loop through the albums and create an option for each album 
			for (var i = 0; i < albums.length; i++) {
				var opt = document.createElement('option');
				opt.value = albums[i].id;
				opt.innerHTML = albums[i].name;
				select.appendChild(opt);
			}
			// display the album selection
			document.getElementById('albumDiv').style.display = 'block';
		})
		.catch(function(e) {
			swal("An error ocurred Line 64 - 95", 'There was an error with the request, please check the console for more information.', "error");
			return console.log(e);
		})
	}

	div = document.createElement('div');
	div.id = 'dropzone';
	div.innerHTML = 'Click here to upload';
	div.style.display = 'flex';

    //Display these elements if logged in.
	document.getElementById('maxFileSize').innerHTML = 'Maximum upload size per file is ' + panel.maxFileSize;
	document.getElementById('loginToUpload').style.display = 'none';
	document.getElementById('itemLogout').innerHTML = `Logout ( ${panel.username} )`;

	if(panel.token === undefined) 
		document.getElementById('loginLinkText').innerHTML = 'Create an account and keep track of your uploads';
//      document.getElementById('itemLogout').style.display = 'none';
		document.getElementById('uploadContainer').appendChild(div);
	
	panel.prepareDropzone();

}

panel.logout = function(){
	localStorage.removeItem("token");
	location.reload('/');
}

panel.prepareDropzone = function(){
	var previewNode = document.querySelector('#template');
	previewNode.id = '';
	var previewTemplate = previewNode.parentNode.innerHTML;
	previewNode.parentNode.removeChild(previewNode);

	var dropzone = new Dropzone('div#dropzone', { 
		url: '/api/upload',
		paramName: 'files[]',
		maxFilesize: panel.maxFileSize.slice(0, -2),
		parallelUploads: 2,
		uploadMultiple: false,
		previewsContainer: 'div#uploads',
		previewTemplate: previewTemplate,
		createImageThumbnails: false,
		maxFiles: 1000,
		autoProcessQueue: true,
		headers: {
    		'token': panel.token
		},
		init: function() {
			panel.myDropzone = this;
			this.on('addedfile', function(file) { 
				document.getElementById('uploads').style.display = 'block';
			});
			// add the selected albumid, if an album is selected, as a header 
			this.on('sending', function(file, xhr) {
				if (panel.album) {
					xhr.setRequestHeader('albumid', panel.album)
				}
			});
		}
	});

	// Update the total progress bar
	dropzone.on('uploadprogress', function(file, progress) {
		file.previewElement.querySelector('.progress').setAttribute('value', progress);
		file.previewElement.querySelector('.progress').innerHTML = progress + '%';
	});

	dropzone.on('success', function(file, response) {

		// Handle the responseText here. For example, add the text to the preview element:

		if(response.success === false){
			var span = document.createElement('span');
			span.innerHTML = response.description;
			file.previewTemplate.querySelector('.link').appendChild(span);
			return;
		}

		a = document.createElement('a');
		a.href = response.files[0].url;
		a.target = '_blank';
		a.innerHTML = response.files[0].url;
		file.previewTemplate.querySelector('.link').appendChild(a);
		
		file.previewTemplate.querySelector('.progress').style.display = 'none';
		
	});

	panel.prepareShareX();
}

panel.prepareShareX = function(){
	if (panel.token) {
		var sharex_element = document.getElementById("ShareX");
		var sharex_file = "{\r\n\
  \"Name\": \"" + location.hostname + "\",\r\n\
  \"DestinationType\": \"ImageUploader, FileUploader\",\r\n\
  \"RequestType\": \"POST\",\r\n\
  \"RequestURL\": \"" + location.origin + "/api/upload\",\r\n\
  \"FileFormName\": \"files[]\",\r\n\
  \"Headers\": {\r\n\
    \"token\": \"" + panel.token + "\"\r\n\
  },\r\n\
  \"ResponseType\": \"Text\",\r\n\
  \"URL\": \"$json:files[0].url$\",\r\n\
  \"ThumbnailURL\": \"$json:files[0].url$\"\r\n\
}";
		var sharex_blob = new Blob([sharex_file], {type: "application/octet-binary"});
		sharex_element.setAttribute("href", URL.createObjectURL(sharex_blob))
		sharex_element.setAttribute("download", location.hostname + ".sxcu");
	}
}

//Handle image paste event
window.addEventListener('paste', function(event) {
	var items = (event.clipboardData || event.originalEvent.clipboardData).items;
	for (index in items) {
		var item = items[index];
		if (item.kind === 'file') {
			var blob = item.getAsFile();
			console.log(blob.type);
			var file = new File([blob], "pasted-image."+blob.type.match(/(?:[^\/]*\/)([^;]*)/)[1]);
			file.type = blob.type;
			console.log(file);
			panel.myDropzone.addFile(file);
		}
	}
});

window.onload = function () {
	panel.checkIfPublic();
};

