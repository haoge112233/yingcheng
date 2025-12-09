// 配置
const API_BASE_URL = 'https://your-termux-server-ip:3000'; // 替换为你的Termux服务器IP
let currentFiles = [];
let selectedFiles = new Set();

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initEventListeners();
    loadFiles('/');
});

// 初始化事件监听
function initEventListeners() {
    // 上传按钮
    document.getElementById('upload-btn').addEventListener('click', showFileSelector);
    document.getElementById('upload-area').addEventListener('click', showFileSelector);
    
    // 文件选择
    document.getElementById('file-selector').addEventListener('change', handleFileSelect);
    
    // 拖拽上传
    const uploadArea = document.getElementById('upload-area');
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    
    // 视图切换
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderFiles(currentFiles, btn.dataset.view);
        });
    });
    
    // 新建文件夹
    document.getElementById('new-folder-btn').addEventListener('click', createNewFolder);
    
    // 刷新按钮
    document.getElementById('refresh-btn').addEventListener('click', () => loadFiles('/'));
    
    // 搜索功能
    document.getElementById('search-input').addEventListener('input', handleSearch);
}

// 加载文件列表
async function loadFiles(path) {
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/files?path=${encodeURIComponent(path)}`);
        const data = await response.json();
        
        if (data.success) {
            currentFiles = data.files;
            renderFiles(currentFiles, 'grid');
            updatePathDisplay(path);
        } else {
            showMessage('加载文件失败: ' + data.message, 'error');
        }
    } catch (error) {
        showMessage('网络错误: ' + error.message, 'error');
        console.error('加载文件错误:', error);
    } finally {
        showLoading(false);
    }
}

// 渲染文件列表
function renderFiles(files, viewType = 'grid') {
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '';
    
    if (files.length === 0) {
        fileList.innerHTML = '<div class="empty-state"><p>文件夹为空</p></div>';
        return;
    }
    
    files.forEach(file => {
        const fileItem = createFileElement(file, viewType);
        fileList.appendChild(fileItem);
    });
}

// 创建文件元素
function createFileElement(file, viewType) {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.dataset.id = file.id;
    div.dataset.type = file.type;
    
    if (selectedFiles.has(file.id)) {
        div.classList.add('selected');
    }
    
    div.innerHTML = `
        <input type="checkbox" class="file-checkbox" data-id="${file.id}">
        <div class="file-icon ${getFileIconClass(file)}">
            <i class="${getFileIcon(file)}"></i>
        </div>
        <div class="file-name" title="${file.name}">${file.name}</div>
        <div class="file-size">${formatFileSize(file.size)}</div>
        <div class="file-date">${formatDate(file.modified)}</div>
    `;
    
    // 点击事件
    div.addEventListener('click', (e) => {
        if (!e.target.classList.contains('file-checkbox')) {
            if (file.type === 'folder') {
                loadFiles(file.path);
            } else {
                previewFile(file);
            }
        }
    });
    
    // 复选框事件
    const checkbox = div.querySelector('.file-checkbox');
    checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        toggleFileSelection(file.id, checkbox.checked);
    });
    
    // 右键菜单
    div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, file);
    });
    
    return div;
}

// 获取文件图标
function getFileIcon(file) {
    if (file.type === 'folder') return 'fas fa-folder';
    
    const ext = file.name.split('.').pop().toLowerCase();
    const iconMap = {
        'jpg': 'fas fa-file-image',
        'jpeg': 'fas fa-file-image',
        'png': 'fas fa-file-image',
        'gif': 'fas fa-file-image',
        'pdf': 'fas fa-file-pdf',
        'doc': 'fas fa-file-word',
        'docx': 'fas fa-file-word',
        'xls': 'fas fa-file-excel',
        'xlsx': 'fas fa-file-excel',
        'ppt': 'fas fa-file-powerpoint',
        'pptx': 'fas fa-file-powerpoint',
        'txt': 'fas fa-file-alt',
        'md': 'fas fa-file-alt',
        'zip': 'fas fa-file-archive',
        'rar': 'fas fa-file-archive',
        'mp3': 'fas fa-file-audio',
        'mp4': 'fas fa-file-video',
        'avi': 'fas fa-file-video'
    };
    
    return iconMap[ext] || 'fas fa-file';
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化日期
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('zh-CN');
}

// 切换文件选择
function toggleFileSelection(fileId, selected) {
    if (selected) {
        selectedFiles.add(fileId);
    } else {
        selectedFiles.delete(fileId);
    }
    
    // 更新UI
    const fileItem = document.querySelector(`.file-item[data-id="${fileId}"]`);
    if (fileItem) {
        fileItem.classList.toggle('selected', selected);
    }
    
    updateToolbar();
}

// 全选
function selectAllFiles() {
    const checkboxes = document.querySelectorAll('.file-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        toggleFileSelection(checkbox.dataset.id, true);
    });
}

// 更新路径显示
function updatePathDisplay(path) {
    document.getElementById('current-path').textContent = path;
}

// 显示文件选择器
function showFileSelector() {
    document.getElementById('file-selector').click();
}

// 处理文件选择
function handleFileSelect(e) {
    handleFiles(e.target.files);
    e.target.value = '';
}

// 处理文件上传
async function handleFiles(fileList) {
    const formData = new FormData();
    
    for (let i = 0; i < fileList.length; i++) {
        formData.append('files', fileList[i]);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/upload`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('上传成功', 'success');
            loadFiles('/'); // 刷新列表
        } else {
            showMessage('上传失败: ' + result.message, 'error');
        }
    } catch (error) {
        showMessage('上传错误: ' + error.message, 'error');
    }
}

// 新建文件夹
async function createNewFolder() {
    const folderName = prompt('请输入文件夹名称:');
    if (!folderName) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/folder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: folderName,
                path: getCurrentPath()
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('文件夹创建成功', 'success');
            loadFiles(getCurrentPath());
        } else {
            showMessage('创建失败: ' + result.message, 'error');
        }
    } catch (error) {
        showMessage('创建错误: ' + error.message, 'error');
    }
}

// 获取当前路径
function getCurrentPath() {
    return document.getElementById('current-path').textContent;
}

// 显示消息
function showMessage(message, type = 'info') {
    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    // 添加到页面
    document.body.appendChild(messageDiv);
    
    // 自动移除
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// 显示加载状态
function showLoading(show) {
    const fileList = document.getElementById('file-list');
    if (show) {
        fileList.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>加载中...</p>
            </div>
        `;
    }
}

// 搜索功能
function handleSearch(e) {
    const keyword = e.target.value.toLowerCase();
    if (keyword.trim() === '') {
        renderFiles(currentFiles, 'grid');
        return;
    }
    
    const filteredFiles = currentFiles.filter(file => 
        file.name.toLowerCase().includes(keyword)
    );
    
    renderFiles(filteredFiles, 'grid');
}

// 预览文件
function previewFile(file) {
    const previewSidebar = document.getElementById('preview-sidebar');
    const previewContent = document.getElementById('preview-content');
    
    document.getElementById('preview-title').textContent = file.name;
    
    // 根据文件类型显示不同预览
    const ext = file.name.split('.').pop().toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];
    const textExts = ['txt', 'md', 'json', 'js', 'css', 'html', 'xml'];
    const pdfExts = ['pdf'];
    
    if (imageExts.includes(ext)) {
        previewContent.innerHTML = `
            <img src="${API_BASE_URL}/api/preview/${file.id}" 
                 alt="${file.name}" 
                 style="max-width:100%; height:auto;">
        `;
    } else if (textExts.includes(ext)) {
        // 显示文本内容
        fetch(`${API_BASE_URL}/api/preview/${file.id}`)
            .then(response => response.text())
            .then(text => {
                previewContent.innerHTML = `
                    <pre style="white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(text)}</pre>
                `;
            });
    } else if (pdfExts.includes(ext)) {
        previewContent.innerHTML = `
            <iframe src="${API_BASE_URL}/api/preview/${file.id}" 
                    width="100%" 
                    height="500px" 
                    frameborder="0"></iframe>
        `;
    } else {
        previewContent.innerHTML = `
            <div class="no-preview">
                <i class="${getFileIcon(file)} fa-3x"></i>
                <p>该文件类型不支持预览</p>
                <p>文件大小: ${formatFileSize(file.size)}</p>
                <button onclick="downloadFile('${file.id}')" class="btn-primary">
                    <i class="fas fa-download"></i> 下载文件
                </button>
            </div>
        `;
    }
    
    previewSidebar.classList.add('active');
}

// 转义HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 下载文件
function downloadFile(fileId) {
    window.open(`${API_BASE_URL}/api/download/${fileId}`, '_blank');
}

// 关闭预览
document.getElementById('close-preview')?.addEventListener('click', () => {
    document.getElementById('preview-sidebar').classList.remove('active');
});

// 工具类函数
function getFileIconClass(file) {
    if (file.type === 'folder') return 'folder';
    const ext = file.name.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    return 'file';
    }
