# Version 0.0.1
#========== Basic Image ==========
From node
MAINTAINER "DreamInSun"

#========== Install Application ==========
RUN npm install express -gd

ADD ./short  /node/short

WORKDIR /node/short
RUN npm install

#========== Environment ==========
ENV MONGODB_CONN mongodb://localhost/short

#==========  ==========
EXPOSE 17000

#========= RUN ==========
CMD node /node/short/app.js