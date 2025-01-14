/**
 * 初始化页面事件监听
 */
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.querySelector('.upload-button');
    const globalQualitySlider = document.getElementById('globalQuality');
    const globalQualityValue = document.getElementById('globalQualityValue');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const imagesList = document.getElementById('imagesList');
    const imagesGrid = document.getElementById('imagesGrid');
    
    // 存储所有图片数据
    const imageItems = new Map();

    // 修改 input 为支持多选
    fileInput.setAttribute('multiple', '');

    // 事件监听器设置
    uploadButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    globalQualitySlider.addEventListener('input', handleGlobalQualityChange);
    downloadAllBtn.addEventListener('click', handleDownloadAll);

    // 拖拽事件
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#007AFF';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#d2d2d7';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#d2d2d7';
        handleFiles(Array.from(e.dataTransfer.files));
    });

    /**
     * 处理文件选择事件
     * @param {Event} e - 文件选择事件对象
     */
    function handleFileSelect(e) {
        handleFiles(Array.from(e.target.files));
    }

    /**
     * 处理多个文件
     * @param {File[]} files - 文件数组
     */
    function handleFiles(files) {
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        if (imageFiles.length === 0) {
            alert('请上传图片文件！');
            return;
        }

        imagesList.style.display = 'block';
        imageFiles.forEach(processImageFile);
    }

    /**
     * 处理单个图片文件
     * @param {File} file - 图片文件
     */
    function processImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const image = new Image();
            image.src = e.target.result;
            image.onload = () => {
                const itemId = `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const imageData = {
                    id: itemId,
                    file,
                    originalImage: image,
                    quality: globalQualitySlider.value / 100
                };
                
                imageItems.set(itemId, imageData);
                createImageItem(imageData);
                compressImage(imageData);
            };
        };
        reader.readAsDataURL(file);
    }

    /**
     * 创建图片项 DOM 元素
     * @param {Object} imageData - 图片数据对象
     */
    function createImageItem(imageData) {
        const itemElement = document.createElement('div');
        itemElement.className = 'image-item';
        itemElement.id = imageData.id;
        
        itemElement.innerHTML = `
            <div class="filename">${imageData.file.name}</div>
            <div class="preview-container">
                <div class="preview-box">
                    <img src="${imageData.originalImage.src}" alt="原图" class="original-preview">
                </div>
                <div class="preview-box">
                    <img alt="压缩预览" class="compressed-preview">
                </div>
            </div>
            <div class="info">
                <div>原始大小: <span class="original-size">${formatFileSize(imageData.file.size)}</span></div>
                <div>压缩大小: <span class="compressed-size">处理中...</span></div>
            </div>
            <div class="compression-controls">
                <input type="range" class="quality-slider" min="0" max="100" value="${globalQualitySlider.value}">
                <span class="quality-value">${globalQualitySlider.value}%</span>
                <button class="download-button">下载</button>
            </div>
        `;

        // 添加事件监听器
        const qualitySlider = itemElement.querySelector('.quality-slider');
        qualitySlider.addEventListener('input', (e) => {
            const quality = e.target.value / 100;
            itemElement.querySelector('.quality-value').textContent = `${e.target.value}%`;
            imageData.quality = quality;
            compressImage(imageData);
        });

        const downloadBtn = itemElement.querySelector('.download-button');
        downloadBtn.addEventListener('click', () => downloadImage(imageData));

        imagesGrid.appendChild(itemElement);
    }

    /**
     * 压缩图片
     * @param {Object} imageData - 图片数据对象
     */
    function compressImage(imageData) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = imageData.originalImage.width;
        canvas.height = imageData.originalImage.height;
        
        ctx.drawImage(imageData.originalImage, 0, 0);
        
        canvas.toBlob((blob) => {
            const itemElement = document.getElementById(imageData.id);
            const compressedPreview = itemElement.querySelector('.compressed-preview');
            const compressedSize = itemElement.querySelector('.compressed-size');
            
            imageData.compressedBlob = blob;
            compressedPreview.src = URL.createObjectURL(blob);
            compressedSize.textContent = formatFileSize(blob.size);
        }, 'image/jpeg', imageData.quality);
    }

    /**
     * 处理全局质量变化
     * @param {Event} e - 输入事件对象
     */
    function handleGlobalQualityChange(e) {
        const quality = e.target.value;
        globalQualityValue.textContent = `${quality}%`;
        
        // 更新所有图片的质量
        imageItems.forEach(imageData => {
            const itemElement = document.getElementById(imageData.id);
            const qualitySlider = itemElement.querySelector('.quality-slider');
            qualitySlider.value = quality;
            itemElement.querySelector('.quality-value').textContent = `${quality}%`;
            imageData.quality = quality / 100;
            compressImage(imageData);
        });
    }

    /**
     * 下载单张图片
     * @param {Object} imageData - 图片数据对象
     */
    function downloadImage(imageData) {
        if (imageData.compressedBlob) {
            const url = URL.createObjectURL(imageData.compressedBlob);
            const a = document.createElement('a');
            const extension = imageData.compressedBlob.type.split('/')[1] || 'jpg';
            const filename = `compressed_${imageData.file.name.replace(/\.[^/.]+$/, '')}.${extension}`;
            
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    /**
     * 批量下载所有图片
     */
    async function handleDownloadAll() {
        if (imageItems.size === 0) return;

        // 使用 JSZip 创建压缩包
        const JSZip = window.JSZip;
        if (!JSZip) {
            alert('正在加载压缩功能，请稍后再试...');
            await loadJSZip();
            handleDownloadAll();
            return;
        }

        const zip = new JSZip();
        const promises = [];

        imageItems.forEach(imageData => {
            if (imageData.compressedBlob) {
                const extension = imageData.compressedBlob.type.split('/')[1] || 'jpg';
                const filename = `compressed_${imageData.file.name.replace(/\.[^/.]+$/, '')}.${extension}`;
                promises.push(
                    imageData.compressedBlob.arrayBuffer().then(buffer => {
                        zip.file(filename, buffer);
                    })
                );
            }
        });

        Promise.all(promises).then(() => {
            zip.generateAsync({ type: 'blob' }).then(content => {
                const url = URL.createObjectURL(content);
                const a = document.createElement('a');
                a.href = url;
                a.download = `compressed_images_${new Date().getTime()}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        });
    }

    /**
     * 加载 JSZip 库
     */
    async function loadJSZip() {
        return new Promise((resolve, reject) => {
            if (window.JSZip) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * 格式化文件大小
     * @param {number} bytes - 文件大小（字节）
     * @returns {string} 格式化后的文件大小
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}); 