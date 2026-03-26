#!/bin/bash

echo "🚀 Building React App for Production..."
# This triggers Vite to compile everything into a 'dist' folder
npm run build

echo "📁 Packaging files for Apache..."
# Remove the old deploy folder if it exists, and make a fresh one
rm -rf deploy_package
mkdir deploy_package

# Copy the compiled React frontend into our package
cp -r dist/* deploy_package/

# NOTE: If you are keeping your PHP files in a local folder (like './api'), 
# you can uncomment the line below to copy them into the package too!
# cp -r api deploy_package/api

echo "✅ Done!"
echo "You can now upload the CONTENTS of the 'deploy_package' folder to your Apache server."
