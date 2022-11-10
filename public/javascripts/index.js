
 //backend server api on localhost 


const submit = document.getElementById("submit");

submit.addEventListener("click", async (e) => {

    e.preventDefault();
    const input = document.getElementById("fileInput");
    const height = document.getElementById("height");
    const width = document.getElementById('width');

    if(!input.value) {
        alert('upload a image first');
        return;
    }

    if(!height.value || !width.value) {
        alert('missing height or width');
        return;
    }

    const formData = new FormData();

    for (const file of input.files) {
        formData.append('image', file)
    }

    // formData.append('image', input.files[0]);
    formData.append('height', height.value);
    formData.append('width', width.value);

    await fetch("/upload", {
        method: "post",
        body: formData,
    }).then((rsp) => {
      if(rsp) {
        return rsp.json()
      }
    }).then((data) => {
        if(data.error == true) {
            console.log(data.message)
            alert("Failed uploading");
        } else {
            alert(data.message)
        }
    })

})

fetch('/upload/getImg').then((rsp) => {
    if(rsp) {
        return rsp.json()
    }}).then((data) => {
        if(data.error == false) {
            console.log(data.images)
            displayImage(data.images);
        }
})


function displayImage(images) {
    let s = "";

    for (const image of images) {
        let key = image.Key
        s += `<img src="/upload/images/${key}" /><br>`
    }

    const appDiv = document.getElementById('images');

    appDiv.innerHTML = s;
}



