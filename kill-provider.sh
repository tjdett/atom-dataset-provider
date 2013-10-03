#!/bin/bash
kill  `ps ax | grep '[n]ode.*atom-dataset-provider' | awk '{print $1}'`

