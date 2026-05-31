#!/bin/bash
# ==============================================================
# HeartWrite 服务器初始化脚本
# 用法：以 root 身份运行（腾讯云轻量服务器默认就是 root）
#   sudo bash setup-server.sh
# ==============================================================
set -e

# ---------- 配置变量（改成你自己的）----------
PROJECT_DIR="/var/www/heartwrite"
REPO_URL="git@github.com:xuesentang/Automated-Self-Media-Content-Creation-Workflow.git"
DOMAIN_OR_IP="你的服务器IP"          # 例如 123.123.123.123
DEEPSEEK_API_KEY="你的DeepSeek API Key"
# YIXIAOER_APP_SECRET 如果是测试阶段可以先不填
YIXIAOER_APP_SECRET=""

echo "1/7 安装系统依赖..."
apt update -y
apt install -y nginx python3 python3-venv python3-pip git curl

# 装 Node.js 20（Vite 需要 18+，不能用 apt 自带的旧版）
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "2/7 克隆项目..."
mkdir -p /var/www
git clone "$REPO_URL" "$PROJECT_DIR"
cd "$PROJECT_DIR"

echo "3/7 创建 Python 虚拟环境..."
python3 -m venv backend/heartwrite-venv
./backend/heartwrite-venv/bin/pip install --upgrade pip
./backend/heartwrite-venv/bin/pip install -r backend/requirements.txt

echo "4/7 安装前端依赖 + 首次构建..."
cd frontend
npm install
npm run build
cd ..

echo "5/7 创建数据目录 + 写环境变量..."
mkdir -p backend/data
cat > /var/www/heartwrite/.env << ENVEOF
DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY
DATABASE_URL=sqlite:///data/app.db
CORS_ORIGINS=http://$DOMAIN_OR_IP
KB_DIR=../knowledge-base
YIXIAOER_APP_SECRET=$YIXIAOER_APP_SECRET
YIXIAOER_ENABLED=false
ENVEOF

echo "6/7 配置 systemd 守护进程..."
cat > /etc/systemd/system/heartwrite.service << SERVICEEOF
[Unit]
Description=HeartWrite Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR/backend
EnvironmentFile=$PROJECT_DIR/.env
ExecStart=$PROJECT_DIR/backend/heartwrite-venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl daemon-reload
systemctl enable heartwrite
systemctl start heartwrite

echo "7/7 配置 Nginx..."
cat > /etc/nginx/sites-available/heartwrite << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN_OR_IP;

    # 前端静态文件
    root $PROJECT_DIR/frontend/dist;
    index index.html;

    # API 反代到后端
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;  # SSE 流式接口需要长超时
        proxy_buffering off;      # SSE 需要关闭缓冲
    }

    # SPA 路由：所有非文件请求回退到 index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINXEOF

# 删掉默认站点，启用我们的
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/heartwrite /etc/nginx/sites-enabled/heartwrite
nginx -t && systemctl reload nginx

echo ""
echo "=============================================="
echo "  初始化完成！"
echo "  访问 http://$DOMAIN_OR_IP 看看"
echo "=============================================="
echo ""
echo "下一步：配置 GitHub Actions 自动部署"
echo "  1. 在服务器上生成 SSH Key：ssh-keygen -t ed25519 -C 'github-actions' -f ~/.ssh/github-actions -N ''"
echo "  2. 把公钥加到 GitHub Deploy Keys：https://github.com/xuesentang/Automated-Self-Media-Content-Creation-Workflow/settings/keys"
echo "     cat ~/.ssh/github-actions.pub"
echo "  3. 在 GitHub 仓库 Settings > Secrets and variables > Actions 里添加三个 Secrets："
echo "     SSH_HOST       = $DOMAIN_OR_IP"
echo "     SSH_USERNAME   = root"
echo "     SSH_PRIVATE_KEY = （cat ~/.ssh/github-actions 的内容）"
echo ""
echo "  配置好之后，每次 git push 就会自动部署到这台服务器。"
