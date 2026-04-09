#!/bin/bash
# Source user environment
source /home/nanan/.profile 2>/dev/null
source /home/nanan/.bashrc 2>/dev/null
sleep 5
# Use script to allocate a pseudo-TTY so runcommand.sh can open /dev/tty
exec script -q -c /usr/bin/emulationstation /dev/null
