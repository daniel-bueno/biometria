
var test = null;

var state = document.getElementById('content-capture');

var myVal = ""; // Drop down selected value of reader 
var disabled = true;
var startEnroll = false;

var currentFormat = Fingerprint.SampleFormat.PngImage;
var deviceTechn = {
               0: "Unknown",
               1: "Optical",
               2: "Capacitive",
               3: "Thermal",
               4: "Pressure"
            }

var deviceModality = {
               0: "Unknown",
               1: "Swipe",
               2: "Area",
               3: "AreaMultifinger"
            }

var deviceUidType = {
               0: "Persistent",
               1: "Volatile"
            }

var FingerprintSdkTest = (function () {
    function FingerprintSdkTest() {
        var _instance = this;
        this.operationToRestart = null;
        this.acquisitionStarted = false;
        this.sdk = new Fingerprint.WebApi;
        this.sdk.onDeviceConnected = function (e) {
            // Detects if the deveice is connected for which acquisition started
            showMessage("Scan your finger");
        };
        this.sdk.onDeviceDisconnected = function (e) {
            // Detects if device gets disconnected - provides deviceUid of disconnected device
            showMessage("Device disconnected");
        };
        this.sdk.onCommunicationFailed = function (e) {
            // Detects if there is a failure in communicating with U.R.U web SDK
            showMessage("Communinication Failed")
        };
        this.sdk.onSamplesAcquired = function (s) {
            // Sample acquired event triggers this function
                sampleAcquired(s);
        };
        this.sdk.onQualityReported = function (e) {
            // Quality of sample aquired - Function triggered on every sample acquired
                document.getElementById("qualityInputBox").value = Fingerprint.QualityCode[(e.quality)];
        }

    }

    FingerprintSdkTest.prototype.startCapture = function () {
        if (this.acquisitionStarted) // Monitoring if already started capturing
            return;
        var _instance = this;
        showMessage("");
        this.operationToRestart = this.startCapture;
        this.sdk.startAcquisition(currentFormat, myVal).then(function () {
            _instance.acquisitionStarted = true;

            //Disabling start once started
            disableEnableStartStop();

        }, function (error) {
            showMessage(error.message);
        });
    };
    FingerprintSdkTest.prototype.stopCapture = function () {
        if (!this.acquisitionStarted) //Monitor if already stopped capturing
            return;
        var _instance = this;
        showMessage("");
        this.sdk.stopAcquisition().then(function () {
            _instance.acquisitionStarted = false;

            //Disabling stop once stoped
            disableEnableStartStop();

        }, function (error) {
            showMessage(error.message);
        });
    };

    FingerprintSdkTest.prototype.getInfo = function () {
        var _instance = this;
        return this.sdk.enumerateDevices();
    };

    FingerprintSdkTest.prototype.getDeviceInfoWithID = function (uid) {
        var _instance = this;
        return  this.sdk.getDeviceInfo(uid);
    };


    return FingerprintSdkTest;
})();

function showMessage(message){
    var _instance = this;
    //var statusWindow = document.getElementById("status");
    x = state.querySelectorAll("#status");
    if(x.length != 0){
        x[0].innerHTML = message;
    }
}

window.onload = function () {
    localStorage.clear();
    test = new FingerprintSdkTest();
    readersDropDownPopulate(true); //To populate readers for drop down selection
    disableEnable(); // Disabling enabling buttons - if reader not selected
    enableDisableScanQualityDiv("content-reader"); // To enable disable scan quality div
    disableEnableExport(true);
};


function onStart() {
    assignFormat();
    if(currentFormat == ""){
        alert("Please select a format.")
    }else{
        test.startCapture();
    }
}
function onStop() {
    test.stopCapture();
}
function onGetInfo() {
    var allReaders = test.getInfo();
    allReaders.then(function (sucessObj) {
        populateReaders(sucessObj);
    }, function (error){
        showMessage(error.message);
    });
}
function onDeviceInfo(id, element){
    var myDeviceVal = test.getDeviceInfoWithID(id);
    myDeviceVal.then(function (sucessObj) {
            var deviceId = sucessObj.DeviceID;
            var uidTyp = deviceUidType[sucessObj.eUidType];
            var modality = deviceModality[sucessObj.eDeviceModality];
            var deviceTech = deviceTechn[sucessObj.eDeviceTech];
            //Another method to get Device technology directly from SDK
            //Uncomment the below logging messages to see it working, Similarly for DeviceUidType and DeviceModality
            //console.log(Fingerprint.DeviceTechnology[sucessObj.eDeviceTech]);
            //console.log(Fingerprint.DeviceModality[sucessObj.eDeviceModality]);
            //console.log(Fingerprint.DeviceUidType[sucessObj.eUidType]);
            var retutnVal = //"Device Info -"
                 "Id : " +  deviceId
                +"<br> Uid Type : "+ uidTyp
                +"<br> Device Tech : " +  deviceTech
                +"<br> Device Modality : " +  modality;

            document.getElementById(element).innerHTML = retutnVal;

        }, function (error){
            showMessage(error.message);
        });

}
function onClear() {
         document.getElementById('imagediv').innerHTML = "";
         document.getElementById('imageBinarize').innerHTML = "";
         document.getElementById('imageGallery').innerHTML = "";

         amostra = [];

         localStorage.setItem("imageSrc", "");
         localStorage.setItem("wsq", "");
         localStorage.setItem("raw", "");
         localStorage.setItem("intermediate", "");

         disableEnableExport(true);
}

function toggle_visibility(ids) {
    document.getElementById("qualityInputBox").value = "";
    onStop();
    enableDisableScanQualityDiv(ids[0]); // To enable disable scan quality div
    for (var i=0;i<ids.length;i++) {
       var e = document.getElementById(ids[i]);
        if(i == 0){
            e.style.display = 'block';
            state = e;
            disableEnable();
        }
       else{
            e.style.display = 'none';
       }
   }
}

var Filters = {};
Filters.threshold = function(pixels, threshold) {
    var d = pixels.data;
    console.log(d);
    for (var i=0; i<d.length; i+=4) {
        // imagem já vem em escala de cinza!
        d[i] = d[i+1] = d[i+2] = (d[i] >= threshold) ? 255 : 0;
    }
    return pixels;
};

var amostra = [];
var dataset = [];

$("#save").on("click",function(){
    if(localStorage.getItem("imageSrc") == "" || localStorage.getItem("imageSrc") == null || document.getElementById('imagediv').innerHTML == ""){
        alert("Error -> Fingerprint not available");
    }else{
        var vDiv = document.getElementById('imageGallery');
        if(vDiv.children.length < 5){
            var image = document.createElement("img");
            image.id = "galleryImage";
            image.className = "img-thumbnail";
            image.src = localStorage.getItem("imageSrc");
            vDiv.appendChild(image);

            amostra.push({'pessoa': $('#nomeID').val() ,'img':imagemTratada()});
            console.log(amostra);

            localStorage.setItem("imageSrc"+vDiv.children.length,localStorage.getItem("imageSrc"));
        }else{
            document.getElementById('imageGallery').innerHTML = "";
            $("#save").click();
        }
    }
});

function onVerificacao() {
    /**
     * calcula a distancia euclidiana dos arrays dataset[0][i]
     * em relação ao array de entrada @array dataset[1][0]
     */

    var array_distancia = [];
    var euclidian;

    for (let i in dataset[0]) {
        euclidian = 0.0;

        for (let j in dataset[0][i]) {
            euclidian += Math.pow((dataset[0][i][j] - dataset[1][0][j]), 2);
            console.log('---------------');
            console.log('+= (', dataset[0][i][j], '-', dataset[1][0][j],') ^ 2 == ', Math.pow((dataset[0][i][j] - dataset[1][0][j]), 2));
            console.log('valor euclidiano sem raiz::> ', euclidian);
        }

        array_distancia.push(Math.sqrt(euclidian));
    }

    console.log(array_distancia);
}

function onSaveAmostra() {
    var soma, md_amostra = [];

    // for (var i in amostra) {
    //     soma = 0.0;
    //     for (let j in amostra[i]) {
    //         soma += amostra[i][j];
    //     }
    //     md_amostra.push(soma);
    // }

    dataset.push(amostra);
    console.log(dataset);
}

function populateReaders(readersArray) {
        var _deviceInfoTable = document.getElementById("deviceInfo");
        _deviceInfoTable.innerHTML = "";
        if(readersArray.length != 0){
            _deviceInfoTable.innerHTML += "<h4>Available Readers</h4>"
            for (i=0;i<readersArray.length;i++){
                _deviceInfoTable.innerHTML +=
                "<div id='dynamicInfoDivs' align='left'>"+
                    "<div data-toggle='collapse' data-target='#"+readersArray[i]+"'>"+
                        "<img src='images/info.png' alt='Info' height='20' width='20'> &nbsp; &nbsp;"+readersArray[i]+"</div>"+
                        "<p class='collapse' id="+'"' + readersArray[i] + '"'+">"+onDeviceInfo(readersArray[i],readersArray[i])+"</p>"+
                    "</div>";
            }
        }
    };

function imagemTratada() {

    function getImageData(image) {
        const tempCanvas = document.createElement('canvas'),
            tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = image.width;
        tempCanvas.height = image.height;
        tempCtx.drawImage(image, 0, 0, image.width, image.height);
        return tempCtx.getImageData(0, 0, image.width, image.height);
    }

    function imbinarize(pixelData) {
        const thresholdLevel = 127.8,    // 0-255
            tstart = new Date().getTime();

        const newImageDataObj = Filters.threshold(pixelData, thresholdLevel);
        const duration = new Date().getTime() - tstart;

        console.log("Filter image: %d msec", duration);
        return {newImageData: newImageDataObj, duration: duration};
    }

    function displayFilteredImage(ctx, newPixelData, objLbph) {
        const tstart = new Date().getTime();

        console.log('lbph::>', objLbph);

        const imageData = ctx.createImageData(498, 498);
        for (let i = 0; i < imageData.data.length; i += 4) {
            // Modify pixel data
            imageData.data[i] = objLbph.data[i];  // R value
            imageData.data[i + 1] = objLbph.data[i + 1];    // G value
            imageData.data[i + 2] = objLbph.data[i + 2];  // B value
            imageData.data[i + 3] = objLbph.data[i + 3];  // A value
        }

        console.log('imageData::>', imageData);

        ctx.putImageData(imageData, 0, 0);
        console.log("Render filtered image: %d msec", (new Date().getTime() - tstart));
    }

    function imageProcess(newPixelData) {
        var newArrayReshape = reshapeImg(newPixelData.data);
        // console.log('reshape::>', newArrayReshape);

        var imgNormalizada = normalizacao(newArrayReshape);
        // console.log('imgNormalizada::>', imgNormalizada);

        return imgNormalizada;
    }
    
    function reshapeImg(image) {
        var pos = 0;
        var arr_aux = [];
        var image_share = [];

        for (var i = 0; i < image.length; i += 4) {
            pos++;
            arr_aux.push(image[i]);

            if (pos === (image.length / 500)) {
                image_share.push(arr_aux);
                pos = 0;
                arr_aux = [];
            }
        }

        /* Calcula média dos arrays */
        var image_media = [];
        for (let j in image_share) {
            var media = 0;
            for (let k in image_share[j]) {
                media += image_share[j][k];
            }
            image_media.push(media / image_share[j].length);
        }

        return image_media;
    }

    function normalizacao(array_values) {
        var min = Math.min(...array_values);
        var max = Math.max(...array_values);

        console.log(min, max);

        for (let i in array_values) {
            array_values[i] = (array_values[i] - min) / (max - min);
        }

        return array_values;
    }

    function histograma(image) {
        /* Cria o histograma da imagem */
        var histogram = new Array(256);
        histogram.fill(0);

        var p = image.data;
        for (var i = 0; i < p.length; i += 4) {
            histogram[p[i]]++;
        }

        return histogram;
    }

    function imToMatriz(image, width = 500)  {
        /* tratamento para imagens com 500xN*/
        var width_default = width;

        var matriz = [[]];
        var vetor = [];
        var pos = 0;

        var imToGray = [];
        for (var g = 0; g < image.data.length; g += 4) {
            imToGray.push(image.data[g]);
        }

        for (var i = 0; i < imToGray.length; i++) {
            vetor.push(imToGray[i]);

            // decremento de width
            if (i === width-1) {
                width += width_default;
                matriz[pos] = vetor;
                pos++;
                vetor = [];
            }
        }

        return matriz;
    }

    /**
     * retorna array devio ao padrao do canvas
     * @param imagem [matriz]
     * @returns {array}
     */
    function lbph(imagem) {

        var new_matriz = [];

        /**
         * array criado para o padrao do canvas
         * @type {any[]}
         */
        var imGrayToCanvas = []

        for (let x = 1; x < imagem.length-1; x++) {
            var row_values = [];

            for (let y = 1; y < imagem[x].length-1; y++) {

                let limiar = imagem[x][y];

                let new_value = maskLbph(x, y, imagem, limiar);

                row_values.push(new_value);

                imGrayToCanvas.push(new_value); // r
                imGrayToCanvas.push(new_value); // g
                imGrayToCanvas.push(new_value); // b
                imGrayToCanvas.push(255); // a
            }

            new_matriz.push(row_values);
        }

        return {
            // data: new Uint8ClampedArray(imGrayToCanvas),
            data: imGrayToCanvas,
            width: imagem.length - 2,
            heigth: imagem[0].length - 2
        };
    }

    function maskLbph(x, y, imagem, limiar) {
        var binary = '';

        for (maskX = x-1; maskX <= x+1; maskX++) {
            for (maskY = y-1; maskY <= y+1; maskY++) {

                if (maskX !== x || maskY !== y) {
                    binary += imagem[maskX][maskY] >= limiar ? '1' : '0';
                }
            }
        }

        return parseInt(binary, 2);
    }


    const image = document.getElementById('image');
    console.log("Original Image: %s, %d x %d", image.src, image.width, image.height);

    // Extract data from the image object
    // imageDataObj: {data (Uint8ClampedArray), width, height}
    // const imageDataObj = Filters.getPixels(image);
    const imageDataObj = getImageData(image);

    console.log("Pixels: type '%s', %d bytes, %d x %d, data: %s...", typeof(imageDataObj.data),
        imageDataObj.data.length, imageDataObj.width, imageDataObj.height,
        imageDataObj.data.slice(0, 10).toString());

    const outputCanvas = document.getElementById('output'),
        ctx = outputCanvas.getContext('2d');

    // No worker: call code inline
    // const imHist = histograma(imageDataObj);

    const imMatriz = imToMatriz(imageDataObj);

    const imLbph = lbph(imMatriz);

    const results = imbinarize(imageDataObj);
    displayFilteredImage(ctx, results.newImageData, imLbph);

    return imageProcess(results.newImageData);
}

function sampleAcquired(s){
            if(currentFormat == Fingerprint.SampleFormat.PngImage){
            // If sample acquired format is PNG- perform following call on object recieved
            // Get samples from the object - get 0th element of samples as base 64 encoded PNG image
                localStorage.setItem("imageSrc", "");
                var samples = JSON.parse(s.samples);
                localStorage.setItem("imageSrc", "data:image/png;base64," + Fingerprint.b64UrlTo64(samples[0]));
                if(state == document.getElementById("content-capture")){
                    var mDiv = document.getElementById('imagediv');
                    mDiv.innerHTML = "";
                    var image = document.createElement("img");
                    image.id = "image";
                    image.src = localStorage.getItem("imageSrc");
                    mDiv.appendChild(image);

                    var nDiv = document.getElementById('imageBinarize');
                    nDiv.innerHTML = "";
                    var canvas = document.createElement("canvas");
                    canvas.id = "output";
                    canvas.width = image.width;
                    canvas.height = image.height;
                    nDiv.appendChild(canvas);
                }

                disableEnableExport(false);
            }

            else if(currentFormat == Fingerprint.SampleFormat.Raw){
                // If sample acquired format is RAW- perform following call on object recieved
                // Get samples from the object - get 0th element of samples and then get Data from it.
                // Returned data is Base 64 encoded, which needs to get decoded to UTF8,
                // after decoding get Data key from it, it returns Base64 encoded raw image data
                localStorage.setItem("raw", "");
                var samples = JSON.parse(s.samples);
                var sampleData = Fingerprint.b64UrlTo64(samples[0].Data);
                var decodedData = JSON.parse(Fingerprint.b64UrlToUtf8(sampleData));
                localStorage.setItem("raw", Fingerprint.b64UrlTo64(decodedData.Data));

                var vDiv = document.getElementById('imagediv').innerHTML = '<div id="animateText" style="display:none">RAW Sample Acquired <br>'+Date()+'</div>';
                setTimeout('delayAnimate("animateText","table-cell")',100);

                disableEnableExport(false);
            }

            else if(currentFormat == Fingerprint.SampleFormat.Compressed){
                // If sample acquired format is Compressed- perform following call on object recieved
                // Get samples from the object - get 0th element of samples and then get Data from it.
                // Returned data is Base 64 encoded, which needs to get decoded to UTF8,
                // after decoding get Data key from it, it returns Base64 encoded wsq image
                localStorage.setItem("wsq", "");
                var samples = JSON.parse(s.samples);
                var sampleData = Fingerprint.b64UrlTo64(samples[0].Data);
                var decodedData = JSON.parse(Fingerprint.b64UrlToUtf8(sampleData));
                localStorage.setItem("wsq","data:application/octet-stream;base64," + Fingerprint.b64UrlTo64(decodedData.Data));

                var vDiv = document.getElementById('imagediv').innerHTML = '<div id="animateText" style="display:none">WSQ Sample Acquired <br>'+Date()+'</div>';
                setTimeout('delayAnimate("animateText","table-cell")',100);

                disableEnableExport(false);
            }

            else if(currentFormat == Fingerprint.SampleFormat.Intermediate){
                // If sample acquired format is Intermediate- perform following call on object recieved
                // Get samples from the object - get 0th element of samples and then get Data from it.
                // It returns Base64 encoded feature set
                localStorage.setItem("intermediate", "");
                var samples = JSON.parse(s.samples);
                var sampleData = Fingerprint.b64UrlTo64(samples[0].Data);
                localStorage.setItem("intermediate", sampleData);

                var vDiv = document.getElementById('imagediv').innerHTML = '<div id="animateText" style="display:none">Intermediate Sample Acquired <br>'+Date()+'</div>';
                setTimeout('delayAnimate("animateText","table-cell")',100);

                disableEnableExport(false);
            }

            else{
                alert("Format Error");
                //disableEnableExport(true);
            }
}

function readersDropDownPopulate(checkForRedirecting){ // Check for redirecting is a boolean value which monitors to redirect to content tab or not
    myVal = "";
    var allReaders = test.getInfo();
    allReaders.then(function (sucessObj) {
        var readersDropDownElement = document.getElementById("readersDropDown");
        readersDropDownElement.innerHTML ="";
        //First ELement
        var option = document.createElement("option");
        option.selected = "selected";
        option.value = "";
        option.text = "Select Reader";
        readersDropDownElement.add(option);
        for (i=0;i<sucessObj.length;i++){
            var option = document.createElement("option");
            option.value = sucessObj[i];
            option.text = sucessObj[i];
            readersDropDownElement.add(option);
        }

    //Check if readers are available get count and  provide user information if no reader available,
    //if only one reader available then select the reader by default and sennd user to capture tab
    checkReaderCount(sucessObj,checkForRedirecting);

    }, function (error){
        showMessage(error.message);
    });
}

function checkReaderCount(sucessObj,checkForRedirecting){
   if(sucessObj.length == 0){
    alert("No reader detected. Please connect a reader.");
   }else if(sucessObj.length == 1){
        document.getElementById("readersDropDown").selectedIndex = "1";
        if(checkForRedirecting){
            toggle_visibility(['content-capture','content-reader']);
            enableDisableScanQualityDiv("content-capture"); // To enable disable scan quality div
            setActive('Capture','Reader'); // Set active state to capture
        }
   }

    selectChangeEvent(); // To make the reader selected
}

function selectChangeEvent(){
    var readersDropDownElement = document.getElementById("readersDropDown");
    myVal = readersDropDownElement.options[readersDropDownElement.selectedIndex].value;
    disableEnable();
    onClear();
    document.getElementById('imageGallery').innerHTML = "";

    //Make capabilities button disable if no user selected
    if(myVal == ""){
        $('#capabilities').prop('disabled', true);
    }else{
        $('#capabilities').prop('disabled', false);
    }
}

function populatePopUpModal(){
    var modelWindowElement = document.getElementById("ReaderInformationFromDropDown");
    modelWindowElement.innerHTML = "";
    if(myVal != ""){
        onDeviceInfo(myVal,"ReaderInformationFromDropDown");
    }else{
        modelWindowElement.innerHTML = "Please select a reader";
    }
}

//Enable disable buttons
function disableEnable(){

    if(myVal != ""){
        disabled = false;
        $('#start').prop('disabled', false);
        $('#stop').prop('disabled', false);
        showMessage("");
        disableEnableStartStop();
    }else{
        disabled = true;
        $('#start').prop('disabled', true);
        $('#stop').prop('disabled', true);
        showMessage("Please select a reader");
        onStop();
    }
}


// Start-- Optional to make GUi user frindly
//To make Start and stop buttons selection mutually exclusive
$('body').click(function(){disableEnableStartStop();});

function disableEnableStartStop(){
     if(!myVal == ""){
        if(test.acquisitionStarted){
            $('#start').prop('disabled', true);
            $('#stop').prop('disabled', false);
        }else{
            $('#start').prop('disabled', false);
            $('#stop').prop('disabled', true);
        }
    }
}

// Stop-- Optional to make GUI user freindly


function enableDisableScanQualityDiv(id){
    if(id == "content-reader"){
        document.getElementById('Scores').style.display = 'none';
    }else{
        document.getElementById('Scores').style.display = 'block';
    }
}


function setActive(element1,element2){
    document.getElementById(element2).className = "";

    // And make this active
   document.getElementById(element1).className = "active";

}



// For Download and formats starts

function onImageDownload(){
    if(currentFormat == Fingerprint.SampleFormat.PngImage){
        if(localStorage.getItem("imageSrc") == "" || localStorage.getItem("imageSrc") == null || document.getElementById('imagediv').innerHTML == "" ){
           alert("No image to download");
        }else{
            //alert(localStorage.getItem("imageSrc"));
            downloadURI(localStorage.getItem("imageSrc"), "sampleImage.png", "image/png");
        }
    }

    else if(currentFormat == Fingerprint.SampleFormat.Compressed){
         if(localStorage.getItem("wsq") == "" || localStorage.getItem("wsq") == null || document.getElementById('imagediv').innerHTML == "" ){
           alert("WSQ data not available.");
        }else{
            downloadURI(localStorage.getItem("wsq"), "compressed.wsq","application/octet-stream");
        }
    }

    else if(currentFormat == Fingerprint.SampleFormat.Raw){
         if(localStorage.getItem("raw") == "" || localStorage.getItem("raw") == null || document.getElementById('imagediv').innerHTML == "" ){
           alert("RAW data not available.");
        }else{

            downloadURI("data:application/octet-stream;base64,"+localStorage.getItem("raw"), "rawImage.raw", "application/octet-stream");
        }
    }

    else if(currentFormat == Fingerprint.SampleFormat.Intermediate){
         if(localStorage.getItem("intermediate") == "" || localStorage.getItem("intermediate") == null || document.getElementById('imagediv').innerHTML == "" ){
           alert("Intermediate data not available.");
        }else{

            downloadURI("data:application/octet-stream;base64,"+localStorage.getItem("intermediate"), "FeatureSet.bin", "application/octet-stream");
        }
    }

    else{
        alert("Nothing to download.");
    }
}


function downloadURI(uri, name, dataURIType) {
    if (IeVersionInfo() > 0){
    //alert("This is IE " + IeVersionInfo());
    var blob = dataURItoBlob(uri,dataURIType);
    window.navigator.msSaveOrOpenBlob(blob, name);

    }else {
        //alert("This is not IE.");
        var save = document.createElement('a');
        save.href = uri;
        save.download = name;
        var event = document.createEvent("MouseEvents");
            event.initMouseEvent(
                    "click", true, false, window, 0, 0, 0, 0, 0
                    , false, false, false, false, 0, null
            );
        save.dispatchEvent(event);
    }
}

dataURItoBlob = function(dataURI, dataURIType) {
    var binary = atob(dataURI.split(',')[1]);
    var array = [];
    for(var i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
    }
    return new Blob([new Uint8Array(array)], {type: dataURIType});
}


function IeVersionInfo() {
  var sAgent = window.navigator.userAgent;
  var IEVersion = sAgent.indexOf("MSIE");

  // If IE, return version number.
  if (IEVersion > 0)
    return parseInt(sAgent.substring(IEVersion+ 5, sAgent.indexOf(".", IEVersion)));

  // If IE 11 then look for Updated user agent string.
  else if (!!navigator.userAgent.match(/Trident\/7\./))
    return 11;

  // Quick and dirty test for Microsoft Edge
  else if (document.documentMode || /Edge/.test(navigator.userAgent))
    return 12;

  else
    return 0; //If not IE return 0
}


$(document).ready(function(){
  $('[data-toggle="tooltip"]').tooltip();
});

function checkOnly(stayChecked)
{
    disableEnableExport(true);
    onClear();
    onStop();
with(document.myForm)
  {
  for(i = 0; i < elements.length; i++)
    {
    if(elements[i].checked == true && elements[i].name != stayChecked.name)
      {
      elements[i].checked = false;
      }
    }
    //Enable disable save button
    for(i = 0; i < elements.length; i++)
    {
    if(elements[i].checked == true)
      {
        if(elements[i].name =="PngImage"){
            disableEnableSaveThumbnails(false);
        }else{
            disableEnableSaveThumbnails(true);
        }
      }
    }
  }
}

function assignFormat(){
    currentFormat = "";
    with(document.myForm){
        for(i = 0; i < elements.length; i++){
            if(elements[i].checked == true){
                if(elements[i].name == "Raw"){
                    currentFormat = Fingerprint.SampleFormat.Raw;
                }
                if(elements[i].name == "Intermediate"){
                    currentFormat = Fingerprint.SampleFormat.Intermediate;
                }
                if(elements[i].name == "Compressed"){
                    currentFormat = Fingerprint.SampleFormat.Compressed;
                }
                if(elements[i].name == "PngImage"){
                    currentFormat = Fingerprint.SampleFormat.PngImage;
                }
            }
        }
    }
}


function disableEnableExport(val){
    if(val){
        $('#saveImagePng').prop('disabled', true);
        $('#imgBinarize').prop('disabled', true);
    }else{
        $('#saveImagePng').prop('disabled', false);
        $('#imgBinarize').prop('disabled', false);
    }
}


function disableEnableSaveThumbnails(val){
    if(val){
        $('#save').prop('disabled', true);
    }else{
        $('#save').prop('disabled', false);
    }
}


function delayAnimate(id,visibility)
{
   document.getElementById(id).style.display = visibility;
}


function perceptron() {

    /******************************************************************************
     * Perceptron Multicamadas (em Javascript).                                   *
     *                                                                            *
     * Implementação simples da rede Perceptron Multicamadas com o treinamento    *
     * utilizando o algoritmo "backpropagation" para classificação das amostras.  *
     *                                                                            *
     * Autor: Gilberto Augusto de Oliveira Bastos                                 *
     * Licença: BSD-2-Clause                                                      *
     ******************************************************************************
     /*************************
     * PeceptronMulticamadas *
     *************************/

    /** Objeto que representa o Perceptron
     Multicamadas, armazenando as referências
     para as camadas da rede. */
    function PerceptronMulticamadas()
    {
        this.camadas = [];
    }

    /** Método que realiza a classificação de algum
     padrão apresentado à rede através do método
     FeedFoward.

     Lembrando que o padrão (array) deve estar normalizado antes
     de ser apresentado à rede para maior agilidade na classificação
     e treinamento. */
    PerceptronMulticamadas.prototype.alimentarPerceptronFeedFoward =
        function (array){

            /* A primeira camada da rede é alimentada através
             do array. */
            this.camadas[0].alimentarCamadaFeedFowardArray(array);

            /* As demais, são alimentadas pela ativação dos
             neurônios das camadas anteriores. */
            for (var c = 1; c < this.camadas.length; c++)
            {
                this.camadas[c].alimentarCamadaFeedFoward(this.camadas[c - 1]);
            }
        };

    /** Método que realiza o treinamento da rede neural através
     dos padrões de treinamento.

     O método recebe a matriz ("matrix") que irá conter
     os padrões e o valor de saída desejado para cada padrão,
     a taxa de aprendizagem e o erro desejado para que
     seja encerrado o treinamento ao Perceptron Multicamadas.
     Exemplo de uma matriz de treinamento "OR" que irá conter
     os padrões para o treinamento:

     var matrizTreinamentoOR = [
     {padrao: [1, 0], objetivo: [1]},
     {padrao: [0, 1], objetivo: [1]},
     {padrao: [0, 0], objetivo: [0]},
     {padrao: [1, 1], objetivo: [1]}
     ];
     Lembrando que cada padrão de treinamento é um objeto, e os
     mesmos são agrupados através de um array convencional
     do Javascript.
     A função irá retornar a quantidade de épocas necessárias para
     realizar o treinamento da rede neural. */
    PerceptronMulticamadas.prototype.treinamentoBackProp =
        function(matrix, taxaAprendizagem, erroDesejado){

            /* Variável que vai armazenar o erro global da
             rede após a apresentação dos padrões. */
            var erroGlobal;

            /* Variável que irá armazenar a quantidade de épocas
             necessária para treinar a rede. */
            var epocas = 0;

            /* Realizando o treinamento... */
            do
            {
                erroGlobal = 0.0;
                /* Apresentando os padrões de treinamento para a rede e
                 realizando o treinamento da mesma. */
                for (var i = 0; i < matrix.length; i++)
                {
                    /* Alimentando a rede com o padrão. */
                    this.alimentarPerceptronFeedFoward(matrix[i].padrao);

                    /* Realizando a retropropagação do erro para a última camada e
                     já somando o erro calculado para o padrão no erro global. */
                    erroGlobal += 0.5 * this.camadas[this.camadas.length - 1].
                    calcularErroRetropropBackPropArray(matrix[i].objetivo);

                    /* Realizando a retropropagação do erro para as demais camadas. */
                    for (var c = this.camadas.length - 2; c >= 0; c--)
                    {
                        this.camadas[c].calcularErroRetropropBackProp(this.camadas[c + 1]);
                    }

                    /* Atualizando os pesos dos neurônios da primeira camada. */
                    this.camadas[0].atualizarPesosNeuroniosArray(matrix[i].padrao,
                        taxaAprendizagem);

                    /* Atualizando os pesos dos neurônios das demais camadas. */
                    for (c = 1; c < this.camadas.length; c++)
                    {
                        this.camadas[c].atualizarPesosNeuroniosCamada(this.camadas[c - 1],
                            taxaAprendizagem);
                    }

                    /* Realizando o cálculo do MSE. */
                    erroGlobal = erroGlobal / matrix.length;

                    /* Atualizando a quantida de épocas. */
                    epocas++;

                    /* Imprimindo o erro MSE para a época atual. */
                    console.log("-----------------");
                    console.log("Época: ", epocas);
                    console.log("Erro MSE: ", erroGlobal, ">", erroDesejado);
                    console.log("Camadas: ", this.camadas);
                }

            } while (erroGlobal > erroDesejado);

            return epocas;
        };

    /** Método que adiciona uma camada à rede Perceptron
     Multicamadas. */
    PerceptronMulticamadas.prototype.adicionarCamada =
        function(camada) {
            this.camadas.push(camada);
        };

    /**********
     * Camada *
     **********/

    /** Objeto que irá representar uma
     camada da rede neural FeedFoward.
     O construtor recebe a quantidade de neurônios
     da camada anterior a que está sendo criada no momento,
     e a quantidade de neurônios que a camada que está sendo criada
     deverá possuir, as funções de ativação e derivada da
     função de ativação e o intervalo para geração dos pesos
     dos neurônios.
     Obs: Se esta for a primeira camada da rede, o parâmetro
     "qtdNeuroniosCamadaAnterior" deve ser igual a quantidade de
     itens (ou neurônios) da camada de entrada da rede. */
    function Camada(qtdNeuroniosCamadaAnterior,
                    qtdNeuroniosCamada,
                    funcaoAtivacao,
                    derivadaFuncaoAtivacao,
                    min,max)
    {
        this.neuronios = [];
        this.funcaoAtivacao = funcaoAtivacao;
        this.derivadaFuncaoAtivacao = derivadaFuncaoAtivacao;

        /* Criando os neurônios para esta
         camada. */
        for (var i = 0; i < qtdNeuroniosCamada; i++)
        {
            this.neuronios.push(new Neuronio(qtdNeuroniosCamadaAnterior, min, max));
        }
    }

    /** Método que realiza a alimentação desta camada
     através do método FeedFoward.
     O método recebe a camada anterior à camada da qualn
     o método está sendo invocado e realiza a alimentação
     da rede. */
    Camada.prototype.alimentarCamadaFeedFoward =
        function(camadaAnterior) {
            /* Percorrendo os neurônios da camada. */
            for (var n = 0; n < this.neuronios.length; n++)
            {
                /* Calculando o valor da função de integração para
                 o neurônio "n-ésimo". */
                var valorFuncaoIntegracao = 0.0;

                for (var i = 0; i < camadaAnterior.neuronios.length; i++)
                {
                    valorFuncaoIntegracao += this.neuronios[n].w[i]
                        * camadaAnterior.neuronios[i].ativacao;
                }

                /* Calculando a ativação do neurônio com o uso do bias
                 com a sua derivada. */
                this.neuronios[n].ativacao = this.funcaoAtivacao(valorFuncaoIntegracao +
                    this.neuronios[n].bias);
                this.neuronios[n].derivadaAtivacao =
                    this.derivadaFuncaoAtivacao(this.neuronios[n].ativacao);
            }
        };

    /** Método que realiza a alimentação desta camada
     através do método FeedFoward.
     O método em vez de receber a camada anterior à esta,
     recebe um vetor contendo algum padrão para ser apresentado
     à camada. Usar este método para apresentar os padrões que
     desejam ser classificados. */
    Camada.prototype.alimentarCamadaFeedFowardArray =
        function(array) {
            /* Percorrendo os neurônios da camada. */
            for (var n = 0; n < this.neuronios.length; n++)
            {
                /* Calculando o valor da função de integração para
                 o neurônio "n-ésimo". */
                var valorFuncaoIntegracao = 0.0;

                for (var i = 0; i < array.length; i++)
                {
                    valorFuncaoIntegracao +=
                        this.neuronios[n].w[i] * array[i];
                }

                /* Calculando a ativação do neurônio com o uso do bias
                 com a sua derivada. */
                this.neuronios[n].ativacao = this.funcaoAtivacao(valorFuncaoIntegracao +
                    this.neuronios[n].bias);
                this.neuronios[n].derivadaAtivacao =
                    this.derivadaFuncaoAtivacao(this.neuronios[n].ativacao);
            }
        };

    /** Método que realiza o cálculo dos erros retropropagados
     dos neurônios desta camada através do método Backprop.
     O método recebe a camada posterior à camada da qual
     o método está sendo invocado e realiza o cálculo
     do erro retropropagado dos neurônios. */
    Camada.prototype.calcularErroRetropropBackProp =
        function(camadaPosterior) {
            /* Percorrendo os neurônios da camada. */
            for (var n = 0; n < this.neuronios.length; n++)
            {
                /* Calculando a soma dos erros da camada posterior
                 multiplicados pelos pesos do neurônio "n-ésimo". */
                var somaErroCamPosterior = 0.0;

                for (var i = 0; i < camadaPosterior.neuronios.length; i++)
                {
                    /* Calculando o erro do neurônio "i-ésimo" da camada posterior
                     multiplicado pelo respectivo peso da camada posterior que se
                     conecta ao respectivo neurônio "n-ésimo" que está tendo seu erro
                     calculado, e somando... */
                    somaErroCamPosterior += camadaPosterior.neuronios[i].w[n] *
                        camadaPosterior.neuronios[i].erroRetroprop;
                }

                /* Por fim, calculando o erro retropropagado do neurônio. */
                this.neuronios[n].erroRetroprop = this.neuronios[n].derivadaAtivacao *
                    somaErroCamPosterior;
            }
        };

    /** Método que realiza o cálculo dos erros retropropagados
     dos neurônios desta camada através do método Backprop.
     Em vez de receber a camada posterior, esse método recebe
     o padrão de saída desejado para esta camada através de
     um array, ou seja, essa função só deve ser executada
     se esta camada for a última camada do Perceptron
     Multicamadas (camada de saída).
     A função retorna o erro do padrão apresentado à
     rede. */
    Camada.prototype.calcularErroRetropropBackPropArray =
        function(array) {

            /* Variável que irá armazenar o erro para o padrão apresentado
             à rede através do "array". */
            var erroPadrao = 0.0;

            /* Percorrendo os neurônios da camada. */
            for (var n = 0; n < this.neuronios.length; n++)
            {
                /* Calculando do erro da saída para o neurônio "n-ésimo". */
                var erroSaidaNeuronio = this.neuronios[n].ativacao -
                    array[n];

                /* Calculando o erro retropropagado. */
                this.neuronios[n].erroRetroprop = erroSaidaNeuronio *
                    this.neuronios[n].derivadaAtivacao;

                /* Calculando o erro para o padrão... */
                erroPadrao += Math.pow(erroSaidaNeuronio, 2);
            }

            /* Retornando o erro do padrão apresentado à rede. */
            return erroPadrao;
        };

    /** Método que realiza a atualização dos pesos dos neurônios da
     camada.
     O método recebe a camada anterior à esta camada e recebe também
     a taxa de aprendizagem para atualização dos pesos. */
    Camada.prototype.atualizarPesosNeuroniosCamada =
        function(camadaAnterior, taxaAprendizagem){
            /* Percorrendo os neurônios da camada. */
            for (var n = 0; n < this.neuronios.length; n++)
            {
                /* Percorrendo os pesos do neurônio "n-ésimo". */
                for (var i = 0; i < camadaAnterior.neuronios.length; i++)
                {
                    /* Atualizando o peso "i-ésimo" do neurônio "n-ésimo". */
                    this.neuronios[n].w[i] += -taxaAprendizagem *
                        camadaAnterior.neuronios[i].ativacao *
                        this.neuronios[n].erroRetroprop;
                }

                /* Atualizando o bias do neurônio "n-ésimo". */
                this.neuronios[n].bias += -taxaAprendizagem *
                    this.neuronios[n].erroRetroprop;
            }
        };

    /** Método que realiza a atualização dos pesos dos neurônios da
     camada.
     O método em vez de receber a camada anterior à esta, recebe um
     array contendo o padrão de entrada que se deseja apresentar
     à rede para ser classificado, além da taxa de aprendizagem. */
    Camada.prototype.atualizarPesosNeuroniosArray =
        function(array, taxaAprendizagem){
            /* Percorrendo os neurônios da camada. */
            for (var n = 0; n < this.neuronios.length; n++)
            {
                /* Percorrendo os pesos do neurônio "n-ésimo". */
                for (var i = 0; i < array.length; i++)
                {
                    /* Atualizando o peso "i-ésimo" do neurônio "n-ésimo". */
                    this.neuronios[n].w[i] += -taxaAprendizagem * array[i] *
                        this.neuronios[n].erroRetroprop;
                }

                /* Atualizando o bias do neurônio "n-ésimo"... */
                this.neuronios[n].bias += -taxaAprendizagem *
                    this.neuronios[n].erroRetroprop;
            }
        };

    /************
     * Neurônio *
     ************
     /** Objeto que irá representar um
     neurônio de uma camada da rede neural
     FeedFoward.

     O construtor recebe a quantidade de pesos
     que o neurônio deverá ter e o bias. Após isso,
     serão gerados os pesos para o neurônio automáticamente
     no intervalo de "min" até "max" (se os parâmetros
     não forem informados, os pesos serão gerados no intervalo
     de -0.5 até 0.5.
     Obs: Caso o parâmetro bias não seja informado,
     o valor padrão para o mesmo será 1. */
    function Neuronio(qtdPesosNeuronio, bias, min, max)
    {
        this.ativacao = 0;
        this.derivadaAtivacao = 0;
        this.erroRetroprop = 0;
        bias === undefined ? this.bias = 1 : this.bias = bias;

        /* Verificando se os parâmetros para o intervalo dos
         pesos foram informados. */
        if (min == undefined || max == undefined)
        {
            /* Caso não tenham sido informados, atribuindo
             o valor padrão para os mesmos. */
            min = -0.5;
            max = 0.5;
        }

        /* Pesos deste neurônio. */
        this.w = [];

        /* Gerando os pesos aleatórios para o neurônio. */
        for (var i = 0; i < qtdPesosNeuronio; i++)
        {
            this.w.push(Math.random() * (max - min) + min);
        }
    }

    /***********************
     * Funções de ativação *
     ***********************/

    /** Módulo que irá armazenar as funções de ativação
     e derivada da rede. */
    (function(exports) {

        exports.degrau = function(z) {
            return (z >= 0) ? 1 : 0;
        };

        exports.derivadaDegrau = function(valDegrau) {
            return 1.0;
        };

        exports.sigmoide = function(z) {
            return 1.0 / ((1.0) + Math.exp(-z));
        };

        exports.derivadaSigmoide = function(valSig) {
            return valSig * (1.0 - valSig);
        };

        exports.tangHiperbolica = function(z) {
            return Math.tanh(z);
        };

        exports.derivadaTangHiperbolica = function(valTangHiperbolica) {
            return 1.0 - Math.pow(valTangHiperbolica, 2);
        };

    })(this.funcoesAtivacao = {});

    /** Instanciando o Perceptron Multicamadas (2-2-1) e adicionando as
     camadas ao mesmo (de processamento e a camada de saída). */
    var pm = new PerceptronMulticamadas();
    pm.adicionarCamada(new Camada(3, 3, this.funcoesAtivacao.sigmoide,
        this.funcoesAtivacao.derivadaSigmoide));
    pm.adicionarCamada(new Camada(3, 1, this.funcoesAtivacao.sigmoide,
        this.funcoesAtivacao.derivadaSigmoide));

    /* Matriz para o treinamento da rede. */
    var matrizTreinamentoXOR = [
        {padrao: [0.97, 0.98, 0.99], objetivo: [1]},
        {padrao: [0.98, 0.95, 1], objetivo: [1]},
        {padrao: [0.90, 1, 0.96], objetivo: [1]},
        {padrao: [1, 0.98, 0.95], objetivo: [1]},
        {padrao: [1, 1, 0.99], objetivo: [1]},
        {padrao: [1, 0.99, 1], objetivo: [1]},
        {padrao: [0.97, 1, 1], objetivo: [1]},
        {padrao: [1, 1, 1], objetivo: [0]},
    ];

    /* Realizando o treinamento da rede com a matriz acima,
     até que o erro da mesma seja menor ou igual a 0.001, com
     taxa de aprendizagem 0.7. */
    pm.treinamentoBackProp(matrizTreinamentoXOR, 0.7, 0.01);

    /* Realizando a alimentação da rede e imprimindo o resultado. */
    console.log("\nResultados do treinamento (XOR):");
    pm.alimentarPerceptronFeedFoward([0, 0, 0]);
    console.log("[0, 0, 0] -> ", pm.camadas[1].neuronios[0].ativacao);
    pm.alimentarPerceptronFeedFoward([1, 0, 0]);
    console.log("[1, 0, 0] -> ", pm.camadas[1].neuronios[0].ativacao);
    pm.alimentarPerceptronFeedFoward([0, 1, 0]);
    console.log("[0, 1, 0] -> ", pm.camadas[1].neuronios[0].ativacao);
    pm.alimentarPerceptronFeedFoward([1, 1, 0]);
    console.log("[1, 1, 0] -> ", pm.camadas[1].neuronios[0].ativacao);

    console.log("Perceptron:", pm);
}


// For Download and formats ends