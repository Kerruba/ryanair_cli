# Ryanair CLI

A simple CLI to query ryanair flights

## How to install

You can install this script using npm from the root of the project
```
npm install -g
```

During development it's convenient to make the symlink on our path point to the index.js we're actually working on, using npm link.
```
npm link
```

## How to use

At the moment the functionalities are very basic

```bash
Usage: ryanair [options] <from> <to> <date>

Options:

-a, --arrival <filter>    Filter flights arrival time. Accept format "[<=>]{time}"
-d, --departure <filter>  Filter flight departure time. Takes format "[<=>]{time}"
-h, --help                output usage information
```
