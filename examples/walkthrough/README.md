# Hello World

```bash send
echo Hello World!
```

Tips: You may press shift+enter inside the code block to run it

# Getting User's Input

```bash run
# @param NAME
echo "Hello, $NAME!"
```

```bash run
# @param OS ["Linux", "Mac", "Windows", "Others"]
echo "Your OS is $OS"
```

# Run a bit dangerous command

```bash run --ask-confirm
echo rm -rf
```

It is fine to run it as it will ask for your confirmation before running the script 

# Change the terminal and cwd

```bash run --terminal="Hello" --cwd ..
echo "The cwd is $PWD"
```

