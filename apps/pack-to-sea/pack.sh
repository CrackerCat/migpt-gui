
# 将文件复制过来
cp ../web-gui-backend/dist/bundle.js bundle.js
cp ../web-gui/index.html index.html

# 生成 blob
node --experimental-sea-config sea-config.json

# 生成单独的
cp "$(command -v node)" migpt

codesign --remove-signature migpt

npx postject migpt NODE_SEA_BLOB sea-prep.blob \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
    --macho-segment-name NODE_SEA

codesign --sign - migpt

mv migpt ../../migpt
