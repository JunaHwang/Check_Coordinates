function openTab(evt, tabName) {
    // 모든 탭 콘텐츠를 숨김
    const tabcontents = document.querySelectorAll(".tabcontent");
    tabcontents.forEach(content => {
        content.style.display = "none";
    });

    // 모든 탭 버튼에서 active 클래스 제거
    const tablinks = document.querySelectorAll(".tablinks");
    tablinks.forEach(link => {
        link.classList.remove("active");
    });

    // 선택한 탭만 표시
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.classList.add("active");

    // 좌표 확인 탭이 선택된 경우 화면 전체를 사용하도록 설정
    if (tabName === 'coordinate-check') {
        document.getElementById('coordinate-check').style.position = 'absolute';
        document.getElementById('coordinate-check').style.top = '0';
        document.getElementById('coordinate-check').style.left = '0';
        document.getElementById('coordinate-check').style.width = '100%';
        document.getElementById('coordinate-check').style.height = '100%';
    }
}

/* function goHome() {
	var i, tabcontent, tablinks;
	tabcontent = document.getElementsByClassName("tabcontent");
	for (i = 0; i < tabcontent.length; i++) {
		tabcontent[i].style.display = "none";
	}
	tablinks = document.getElementsByClassName("tablinks");
	for (i = 0; i < tablinks.length; i++) {
		tablinks[i].className = tablinks[i].className.replace(" active", "");
	}
	document.getElementById("homeContent").style.display = "block";
} */


/* window.onload = function() {
	goHome(); // 페이지 로드 시 '홈' 탭 열기
}; */


function showToast(message, type = 'success') {
	
	let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
	const toast = document.createElement('div');
	toast.className = 'toast';

	// 타입에 따라 클래스 추가
	if (type === 'success') {
		toast.classList.add('toast-success');
	} else if (type === 'warning') {
		toast.classList.add('toast-warning');
	}

	toast.textContent = message;
	document.body.appendChild(toast);

	setTimeout(() => {
		toast.classList.add('fade-out');
		toast.addEventListener('transitionend', () => toast.remove());
	}, 2000);
}

const fileInputImage = document.getElementById('file-input-image');
const image = document.getElementById('image');
const canvas = document.getElementById('canvas');
const croppedImagesContainer = document.getElementById('cropped-images-container');
const ctx = canvas.getContext('2d');
const coordinatesDisplay = document.getElementById('coordinates');
const copyButton = document.getElementById('copy-button');
const jsonOutput = document.getElementById('json-output');
const copyJsonButton = document.getElementById('copy-json-button');
const resetButton = document.getElementById('reset-button');
const undoButton = document.getElementById('undo-button');
const redoButton = document.getElementById('redo-button'); // 되돌리기 취소 버튼 추가

let startX, startY, isDrawing = false;
let rectangles = [];
let undoStack = []; // 변경 사항을 저장하는 스택
let redoStack = []; // 되돌리기 취소 스택

fileInputImage.addEventListener('change', handleFileSelect);
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', drawRectangle);
canvas.addEventListener('mouseup', finishDrawing);
copyButton.addEventListener('click', copyCoordinatesToClipboard);
copyJsonButton.addEventListener('click', copyJsonToClipboard);
resetButton.addEventListener('click', resetCanvas);
undoButton.addEventListener('click', undoLastAction);
redoButton.addEventListener('click', redoLastAction); // 되돌리기 취소 버튼에 이벤트 추가

document.addEventListener('keydown', function(event) {
    if (event.shiftKey && event.key === 'Z') {
        event.preventDefault(); // 기본 동작 방지
        undoLastAction(); // 되돌리기 함수 호출
    }
    if (event.shiftKey && event.key === 'X') {
        event.preventDefault(); // 기본 동작 방지
        redoLastAction(); // 되돌리기 취소 함수 호출
    }
});

function handleFileSelect(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        image.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

image.onload = function() {
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
};

function startDrawing(event) {
    const rect = canvas.getBoundingClientRect();
    startX = event.clientX - rect.left;
    startY = event.clientY - rect.top;
    isDrawing = true;
}

function drawRectangle(event) {
    if (!isDrawing) return; // 드래그 중이 아니면 반환

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const width = x - startX;
    const height = y - startY;

    // 기존 좌표와 새로 그리는 사각형 모두를 그리기 위해 캔버스를 초기화합니다.
    drawRectangles(); 

    // 현재 드래그 중인 사각형을 그라디언트로 그립니다.
    const gradient = ctx.createLinearGradient(startX, startY, x, y);
    gradient.addColorStop(0, 'lime'); // 녹색
    gradient.addColorStop(1, 'blue'); // 파란색
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, startY, width, height);
}


function finishDrawing(event) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const width = x - startX;
    const height = y - startY;

    // 좌표 정수로 변환
    const xmin = Math.floor(Math.min(startX, x));
    const ymin = Math.floor(Math.min(startY, y));
    const xmax = Math.floor(Math.max(startX, x));
    const ymax = Math.floor(Math.max(startY, y));

    const newRect = {
        x: xmin,
        y: ymin,
        width: xmax - xmin,
        height: ymax - ymin
    };

    // 현재 상태를 되돌리기 스택에 저장
    undoStack.push([...rectangles]);
    redoStack = []; // 새로운 작업이 추가되면 되돌리기 취소 스택 초기화

    rectangles.push(newRect);
    updateCoordinatesDisplay();
    updateJSONDisplay();
    updateCroppedImages();
    isDrawing = false;

    drawRectangles(); // 새 사각형 그리기
}

function undoLastAction() {
    if (undoStack.length === 0) return; // 되돌릴 내용이 없으면 반환
    redoStack.push([...rectangles]); // 현재 상태를 되돌리기 취소 스택에 저장
    rectangles = undoStack.pop(); // 스택에서 마지막 상태를 꺼내서 현재 상태로 설정

    drawRectangles(); // 사각형을 다시 그리기
    updateCoordinatesDisplay();
    updateJSONDisplay();
    updateCroppedImages();
}

function redoLastAction() {
    if (redoStack.length === 0) return; // 되돌리기 취소할 내용이 없으면 반환
    undoStack.push([...rectangles]); // 현재 상태를 되돌리기 스택에 저장
    rectangles = redoStack.pop(); // 스택에서 마지막 상태를 꺼내서 현재 상태로 설정

    drawRectangles(); // 사각형을 다시 그리기
    updateCoordinatesDisplay();
    updateJSONDisplay();
    updateCroppedImages();
}

function updateCoordinatesDisplay() {
    const coordinates = rectangles.map(r => {
        const xmin = Math.floor(r.x);
        const ymin = Math.floor(r.y);
        const xmax = Math.floor(r.x + r.width);
        const ymax = Math.floor(r.y + r.height);
        return `${xmin} ${ymin} ${xmax} ${ymin} ${xmax} ${ymax} ${xmin} ${ymax}##::`;
    }).join('\n');

    coordinatesDisplay.textContent = coordinates;
}

function updateJSONDisplay() {
    const jsonDataArray = rectangles.map(r => ({
        tag: "img",
        coords: [
            { x: r.x, y: r.y },
            { x: r.x + r.width, y: r.y },
            { x: r.x + r.width, y: r.y + r.height },
            { x: r.x, y: r.y + r.height }
        ],
        attr: {
            borderType: "None"
        }
    }));

    const jsonText = jsonDataArray.map(data => JSON.stringify(data, null, "\t")).join(",\n");

    jsonOutput.textContent = jsonText;
}

function updateCroppedImages() {
    croppedImagesContainer.innerHTML = '';

    rectangles.forEach((rect, index) => {
        const { x, y, width, height } = rect;

        const croppedCanvas = document.createElement('canvas');
        const croppedCtx = croppedCanvas.getContext('2d');

        croppedCanvas.width = width;
        croppedCanvas.height = height;

        croppedCtx.drawImage(image, x, y, width, height, 0, 0, width, height);

        const container = document.createElement('div');
        container.className = 'cropped-image-container';
        
        const numberLabel = document.createElement('div');
        numberLabel.className = 'number-label';
        numberLabel.textContent = `${index + 1}`;
        
        container.appendChild(croppedCanvas);
        container.appendChild(numberLabel);
        croppedImagesContainer.appendChild(container);
    });
}

function copyCoordinatesToClipboard() {
    const coordinates = coordinatesDisplay.textContent;
    if (coordinates) {
        navigator.clipboard.writeText(coordinates)
            .then(() => showToast('좌표가 클립보드에 복사되었습니다.'))
            .catch(err => console.error('좌표 복사 실패.', err));
    } else {
        showToast('복사할 좌표가 없습니다.', 'warning');
    }
}

function copyJsonToClipboard() {
    const jsonText = jsonOutput.textContent;
    if (jsonText) {
        navigator.clipboard.writeText(jsonText)
            .then(() => showToast('JSON이 클립보드에 복사되었습니다.'))
            .catch(err => console.error('JSON 복사 실패.', err));
    } else {
        showToast('복사할 JSON 데이터가 없습니다.', 'warning');
    }
}

function resetCanvas() {
    undoStack = []; // 되돌리기 스택 초기화
    redoStack = []; // 되돌리기 취소 스택 초기화
    rectangles = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateCoordinatesDisplay();
    updateJSONDisplay();
    updateCroppedImages();
    image.src = ''; 
    fileInputImage.value = ''; 
	
	canvas.width = 0;
    canvas.height = 0;
}

function initializeCanvas() {
    canvas.width = 0;
    canvas.height = 0;
}

initializeCanvas(); // 초기화 호출



let lastFileName = '';

function handleFileSelect(event) {
    const file = event.target.files[0];
    
    if (!file) {
        // 파일 선택이 취소된 경우
        return;
    }

    // 파일 이름이 바뀌었는지 확인
    if (file.name !== lastFileName) {
        lastFileName = file.name;
        const reader = new FileReader();
        
        reader.onload = function(e) {
            image.src = e.target.result;
        };
        
        reader.readAsDataURL(file);
        
        // 기존 데이터 초기화
        resetData();
    }
}

function resetData() {
    // Clear existing rectangles
    rectangles = [];
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0; // Reset canvas width
    canvas.height = 0; // Reset canvas height
    
    // Clear coordinate and JSON output
    updateCoordinatesDisplay();
    updateJSONDisplay();
    updateCroppedImages();
}


const coordinatesInput = document.getElementById('coordinates-input');
const loadCoordinatesButton = document.getElementById('load-coordinates-button');

// 좌표 로드 버튼 클릭 시
loadCoordinatesButton.addEventListener('click', () => {
    const inputText = coordinatesInput.value.trim();
    if (inputText) {
        loadExistingCoordinates(inputText);
		showToast('적용 되었습니다.');
    }
});

// 기존 좌표 로드 함수
function loadExistingCoordinates(text) {
    const lines = text.split('\n');
    existingRectangles = []; // 기존 좌표 배열 초기화
    lines.forEach(line => {
        const [coordinates, label] = line.split('##::');
        if (coordinates) {
            const coords = coordinates.trim().split(' ').map(Number);
            if (coords.length === 8) {
                const [x1, y1, x2, y2, x3, y3, x4, y4] = coords;
                existingRectangles.push({ x1, y1, x2, y2, x3, y3, x4, y4 });
            }
        }
    });
    drawRectangles(); // 기존 좌표 그리기
}

// 캔버스에 사각형을 그리는 함수
function drawRectangleOnCanvas(x1, y1, x2, y2, x3, y3, x4, y4) {
    ctx.strokeStyle = 'lime'; // 형광 녹색
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.stroke();
}

let existingRectangles = []; // 기존 좌표로 그린 사각형

function drawRectangles() {
    // 캔버스를 초기화하고 이미지를 다시 그립니다.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    // 기존 좌표 사각형 그리기 (조건에 따라 표시 여부 결정)
    if (showExistingCoordinates) {
        existingRectangles.forEach(rect => {
            const x1 = Math.floor(rect.x1);
            const y1 = Math.floor(rect.y1);
            const x2 = Math.floor(rect.x2);
            const y2 = Math.floor(rect.y2);
            const x3 = Math.floor(rect.x3);
            const y3 = Math.floor(rect.y3);
            const x4 = Math.floor(rect.x4);
            const y4 = Math.floor(rect.y4);

            ctx.strokeStyle = 'orange'; // 형광 주황색
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.lineTo(x4, y4);
            ctx.closePath();
            ctx.stroke();
        });
    }

    // 새로 그린 사각형 그리기 (그라디언트)
    rectangles.forEach((r, i) => {
        const xmin = Math.floor(r.x);
        const ymin = Math.floor(r.y);
        const xmax = Math.floor(r.x + r.width);
        const ymax = Math.floor(r.y + r.height);

        const gradient = ctx.createLinearGradient(xmin, ymin, xmax, ymax);
        gradient.addColorStop(0, 'lime'); // 녹색
        gradient.addColorStop(1, 'blue'); // 파란색
        
        ctx.strokeStyle = gradient; // 그라디언트 적용
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xmin, ymin);
        ctx.lineTo(xmax, ymin);
        ctx.lineTo(xmax, ymax);
        ctx.lineTo(xmin, ymax);
        ctx.closePath();
        ctx.stroke();
        ctx.font = '12px Arial';
        ctx.fillStyle = 'lime'; // 녹색
        ctx.fillText(i + 1, xmin, ymin - 5);
    });
}

const resetExistingCoordinatesButton = document.getElementById('reset-existing-coordinates-button');
resetExistingCoordinatesButton.addEventListener('click', resetExistingCoordinates);

// 기존 좌표 초기화 함수
function resetExistingCoordinates() {
    // 기존 좌표를 저장하는 배열을 초기화
    existingRectangles = [];
    
    // 캔버스를 초기화하고 이미지를 다시 그립니다.
    drawRectangles(); 
    
    showToast('기존 좌표가 초기화되었습니다.');
}

const toggleExistingCoordinatesButton = document.getElementById('toggle-existing-coordinates-button');
let showExistingCoordinates = true; // 기본적으로 기존 좌표를 표시하도록 설정

toggleExistingCoordinatesButton.addEventListener('click', toggleExistingCoordinates);
/* document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.altKey && event.code === 'Space') {
        event.preventDefault(); // 기본 동작 방지
        toggleExistingCoordinates();
    }
}); */

function toggleExistingCoordinates() {
    showExistingCoordinates = !showExistingCoordinates; // 현재 상태를 반전시킵니다.

    drawRectangles(); // 캔버스를 다시 그려줍니다.

}

const fileInputTxt = document.getElementById('file-input-txt');

fileInputTxt.addEventListener('change', handleTxtFileSelect);

function handleTxtFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            coordinatesInput.value = e.target.result;
        };
        reader.readAsText(file);
    }
}


// 좌표 확인 탭 기능
// script.js

document.addEventListener('DOMContentLoaded', () => {
    const fileList = document.getElementById('file-list');
    const folderInput = document.getElementById('folder-input');
    const image = document.getElementById('image');
    const coordinatesInput = document.getElementById('coordinates-input');
    const folderNameElement = document.getElementById('folder-name'); // 폴더 이름 표시 요소 추가
    const resetButton = document.getElementById('reset-button'); // '초기화' 버튼
    const loadCoordinatesButton = document.getElementById('load-coordinates-button'); // '기존 폴리곤 적용' 버튼
    const clearDataButton = document.getElementById('clear-data-button'); // '전체 데이터 삭제' 버튼

    if (!fileList || !folderInput || !image || !coordinatesInput || !folderNameElement || !resetButton || !loadCoordinatesButton || !clearDataButton) {
        console.error('필수 요소가 문서에서 발견되지 않았습니다.');
        return;
    }

    // 폴더 업로드 처리
    folderInput.addEventListener('change', function(event) {
        const files = Array.from(event.target.files);

        if (files.length > 0) {
            const firstFile = files[0];
            const folderName = firstFile.webkitRelativePath.split('/')[0]; // 폴더 이름 추출
            folderNameElement.textContent = `폴더: ${folderName}`; // 폴더 이름 표시
        }

        // 파일 목록을 업데이트
        updateFileList(files);
    });

    function updateFileList(files) {
        const fileMap = {};

        files.forEach(file => {
            if (file.type === 'image/png' || file.type === 'text/plain') {
                const name = file.name.split('.').slice(0, -1).join('.');
                if (!fileMap[name]) {
                    fileMap[name] = {};
                }
                if (file.type === 'image/png') {
                    fileMap[name].image = file;
                } else if (file.type === 'text/plain') {
                    fileMap[name].text = file;
                }
            }
        });

        const sortedNames = Object.keys(fileMap).sort((a, b) => {
            const numA = extractNumber(a);
            const numB = extractNumber(b);
            return numA - numB;
        });

        fileList.innerHTML = ''; // 기존 목록 초기화
        sortedNames.forEach(name => {
            const listItem = document.createElement('li');
            listItem.textContent = name;
            listItem.className = 'file-item'; // file-item 클래스 추가
            listItem.addEventListener('click', () => handleFileClick(fileMap[name]));
            fileList.appendChild(listItem);
        });
    }

    function extractNumber(filename) {
        const numbers = filename.match(/\d+/g);
        if (numbers) {
            return parseInt(numbers.join(''), 10);
        }
        return 0;
    }

    function handleFileClick(fileMap) {
        resetButton.click();

        setTimeout(() => {
            loadFile(fileMap);

            setTimeout(() => {
                loadCoordinatesButton.click();
            }, 300);
        }, 300);
    }

    function loadFile(fileMap) {
        const imageFile = fileMap.image;
        const textFile = fileMap.text;

        if (imageFile) {
            const imageUrl = URL.createObjectURL(imageFile);
            image.src = imageUrl;
        }

        if (textFile) {
            const reader = new FileReader();
            reader.onload = function(e) {
                coordinatesInput.value = e.target.result;
            };
            reader.readAsText(textFile);
        }
    }

    // 전체 데이터 삭제 버튼 클릭 시 페이지 새로 고침
    clearDataButton.addEventListener('click', () => {
        window.location.reload();
    });

    // 파일 항목 클릭 시 선택 처리
    fileList.addEventListener('click', function(event) {
        if (event.target.classList.contains('file-item')) {
            document.querySelectorAll('#file-list .file-item').forEach(el => el.classList.remove('selected'));
            event.target.classList.add('selected');
        }
    });
});


document.addEventListener('keydown', function(event) {
// Ctrl + Space를 눌렀을 때
if (event.ctrlKey && event.code === 'Space') {
	event.preventDefault(); // 기본 동작 방지
	document.getElementById('load-coordinates-button').click(); // 버튼 클릭
	showToast('적용 되었습니다.');
}
});

document.addEventListener('DOMContentLoaded', () => {
    const scrollTopButton = document.getElementById('scroll-top'); // '맨 위로' 버튼

    if (!scrollTopButton) {
        console.error('필수 요소가 문서에서 발견되지 않았습니다.');
        return;
    }

    // 버튼 클릭 시 페이지 최상단으로 스크롤
    scrollTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth' // 부드럽게 스크롤
        });
    });
});



document.getElementById('save-text-file').addEventListener('click', function() {
    // 현재 선택된 파일의 이름을 가져옴
    const selectedFileName = getSelectedFileName(); // 이 함수는 선택된 파일의 이름을 반환해야 함

    // 기존 폴리곤과 새로 그려진 좌표를 포함한 텍스트를 가져옴
    const textContent = getPolygonTextContent(); // 이 함수는 폴리곤 입력 창의 텍스트를 반환해야 함

    // 파일 저장 경로를 설정하는 창을 띄우는 방법
    const fileName = `${selectedFileName}.txt`;

    // 텍스트 파일을 Blob으로 생성
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });

    // 파일 저장을 위한 URL 생성
    const url = URL.createObjectURL(blob);

    // 다운로드 링크를 생성하고 클릭하여 파일을 저장
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();

    // 메모리에서 URL 해제
    URL.revokeObjectURL(url);
});

// 선택된 파일의 이름을 반환하는 함수
function getSelectedFileName() {
    // 파일 목록을 가져오는 요소
    const fileList = document.querySelector('#file-list'); 

    // 선택된 파일이 있는지 확인
    const selectedFile = fileList.querySelector('.selected'); 

    // 선택된 파일의 이름을 반환
    return selectedFile ? selectedFile.textContent.trim() : 'default-file-name'; 
}

// 폴리곤 입력 창의 텍스트를 반환하는 함수
function getPolygonTextContent() {
    // 폴리곤 입력 창의 요소
    const coordinatesInput = document.getElementById('coordinates-input'); 

    // 폴리곤 입력 창의 텍스트를 반환
    return coordinatesInput ? coordinatesInput.value : ''; 
}

/// 텍스트 파일 저장 버튼 클릭 시 호출되는 함수
function saveTextFile() {
    const fileName = getSelectedFileName(); // 선택된 파일 이름 가져오기
    const fileContent = getPolygonTextContent(); // 폴리곤 텍스트 가져오기

    // Blob 객체 생성
    const blob = new Blob([fileContent], { type: 'text/plain' });

    // 파일 저장 대화상자 열기
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName + '.txt'; // 파일 확장자는 .txt
    a.click();

    // URL 객체 해제
    URL.revokeObjectURL(url);
}


// JSON IMAGE 추가

let fileName = '';

document.getElementById('load-json-file').addEventListener('change', function(event) {
	const file = event.target.files[0];
	if (file) {
		fileName = file.name.replace('.json', ''); // 파일 이름에서 .json 확장자를 제거
		const reader = new FileReader();
		reader.onload = function(e) {
			const json = e.target.result;
			document.getElementById('json-raw').value = json;
		};
		reader.readAsText(file);
	}
});

document.getElementById('merge-json').addEventListener('click', function() {
	try {
		const existingJsonText = document.getElementById('json-raw').value;
		const newJsonText = document.getElementById('json-output').value;

		if (!existingJsonText || !newJsonText) {
			alert('기존 JSON 데이터와 추가할 JSON 데이터 모두 입력해야 합니다.');
			return;
		}

		const existingJson = JSON.parse(existingJsonText);
		const newJson = JSON.parse(`[${newJsonText}]`); // 배열로 감싸서 파싱

		// JSON 병합
		const mergedJson = mergeJson(existingJson, newJson);

		// 병합된 JSON 출력
		document.getElementById('merged-json').value = JSON.stringify(mergedJson, null, 2);
	} catch (error) {
		alert('JSON 데이터 처리 중 오류가 발생했습니다.');
	}
});

document.getElementById('save-json').addEventListener('click', function() {
	const mergedJsonText = document.getElementById('merged-json').value;
	const blob = new Blob([mergedJsonText], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = fileName + '.json'; // 파일 확장자는 .json
	a.click();
	URL.revokeObjectURL(url);
});

function mergeJson(existingJson, newJsonArray) {
	// 기존 JSON 데이터에서 마지막 태그를 찾고, 그 뒤에 새 데이터를 추가
	function addToLastTag(json, newData) {
		if (Array.isArray(json)) {
			json.push(...newData);
		} else if (json.data && Array.isArray(json.data)) {
			json.data.push(...newData);
		} else if (json.child && Array.isArray(json.child)) {
			json.child.push(...newData);
		}
		return json;
	}

	return addToLastTag(existingJson, newJsonArray);
}


