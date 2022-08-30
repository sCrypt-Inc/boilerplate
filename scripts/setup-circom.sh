#!/bin/sh
CIRCOM_VERSION="2.0.5"
GITHUB_OWNER="iden3"
GITHUB_REPO="circom"
GLOB_INST_DIR="/usr/local/bin"
LOCAL_INST_DIR="$HOME/.local/bin"
BIN_NAME="circom"
SKIP_PROMPT=0
DISPLAY_HELP=0
UNINSTALL=0


# If compiler version isn't explicitly specified, try to look up the latest stable rease on the web.
if [ -z $CIRCOM_VERSION ]; then
    res=$(curl -s https://api.github.com/repos/iden3/circom/releases/latest | grep "tag_name" ) 

    CIRCOM_VERSION=$(echo $res | cut -d'=' -f2 | sed -e "s/tag_name//g" -e "s/[\": ,v]//g")
fi
GITHUB_TAG="v$CIRCOM_VERSION"

is_user_root () { [ "$(id -u)" -eq 0 ]; }

# Detect platform.
UNAME=$(uname)
if [ "$UNAME" = "Linux" -o "$UNAME" = "FreeBSD" ]; then
    URL_POSTFIX="circom-linux-amd64"
elif [ "$UNAME" = "Darwin" ]; then
    URL_POSTFIX="circom-macos-amd64"
else
    URL_POSTFIX="circom-windows-amd64.exe"
fi

# URL to download from.
DL_URL="https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${GITHUB_TAG}/${URL_POSTFIX}"

echo $DL_URL
if [ $(curl -o /dev/null -s -w "%{http_code}\n" $DL_URL) = "404" ]; then
    echo  "Version not found: $GITHUB_TAG"
    exit 1
fi

# Check if global or local install.
if ! is_user_root; then
    INSTALL_DIR="$LOCAL_INST_DIR"
else
    INSTALL_DIR="$GLOB_INST_DIR"
fi

# Create install dir if it doesn't exist yet.
mkdir -p $INSTALL_DIR


# Installation procedure
echo "You are about to download and install circom $GITHUB_TAG for $UNAME."
echo
echo "The binary will be installed to $INSTALL_DIR/$BIN_NAME. Make sure, that the containing directory is in your PATH."
if [ -f "$INSTALL_DIR/$BIN_NAME" ]; then
    echo "An existing circom binary already exists in $INSTALL_DIR/$BIN_NAME. It will be overwritten."
fi
echo

# Remove old install if it exists.
if [ -f "$INSTALL_DIR/$BIN_NAME" ]; then
    rm $INSTALL_DIR/$BIN_NAME
fi

# Download and install circom.
curl -L -J $DL_URL -o $INSTALL_DIR/$BIN_NAME || exit 7
chmod +x $INSTALL_DIR/$BIN_NAME || exit 10

echo
echo "circom ${GITHUB_TAG} was successfully installed."
