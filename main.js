var http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var template = require('./lib/template.js');
var path = require('path');
var sanitizeHtml = require('sanitize-html');
var mysql = require('mysql2');
var db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'opentutorials'
})
db.connect();

var app = http.createServer(function (request, response) {
  var _url = request.url;
  var queryData = url.parse(_url, true).query;
  var pathname = url.parse(_url, true).pathname;
  if (pathname === '/') {
    if (queryData.id === undefined) {
      db.query(`SELECT * FROM topic`, function (err, topics) {
        if (err) throw error;

        var title = 'Home page';
        var description = 'Hello, Node.js';
        var list = template.list(topics);
        var html = template.HTML(title, list,
          `<h2>${title}</h2>${description}`,
          `<a href="/create">create</a>`
        );
        response.writeHead(200);
        response.end(html);
      })
    } else {
      db.query(`SELECT * FROM topic`, function (dirErr, topics) {
        if (dirErr) throw error;

        db.query(`SELECT * FROM topic LEFT JOIN author ON topic.author_id=author.id WHERE topic.id=?`, [queryData.id], function (fileErr, topic) { // 배열에 담아서 주면 더 안전함. SQL문에 자동으로 치환해서 id=? 값에 넣어줌. 원래는 topic.id=${queryData.id} 였음. (세탁)
          if (fileErr) throw error;

          var list = template.list(topics);
          var html = template.HTML(topic[0].title, list,
            `<h2>${topic[0].title}</h2>
            ${topic[0].description}
            <p>Posted by ${topic[0].name}</p>`,
            `<a href="/create">create</a>
            <a href="/update?id=${queryData.id}">update</a>
            <form action="delete_process" method="post">
            <input type="hidden" name="id" value="${queryData.id}">
            <input type="submit" value="delete">
            </form>`
          );
          response.writeHead(200);
          response.end(html);
        })
      })
    }
  } else if (pathname === '/create') {
    db.query(`SELECT * FROM topic`, function (err, topics) {
      if (err) throw error;

      db.query(`SELECT * FROM author`, function (err, authors) {
        var title = 'Create page'
        var description = 'Make a new one';
        var list = template.list(topics);
        var html = template.HTML(title, list,
          `<h2>${title}</h2>
        ${description}
        <form action="/create_process" method="post">
          <p><input type="text" name="title" placeholder="title"></p>
          <p>
            <textarea name="description" placeholder="description"></textarea>
          </p>
          <p>
          ${template.authorPicker(authors)}
          </p>
          <p>
            <input type="submit" value="Post new">
          </p>
        </form>`,
          `<a href="/create">create</a>`
        );
        response.writeHead(200);
        response.end(html);
      })
    })
  } else if (pathname === '/create_process') {
    var body = '';
    request.on('data', function (data) {
      body = body + data;
    });
    request.on('end', function () {
      var post = qs.parse(body);
      db.query(`
      INSERT INTO topic (title, description, created, author_id) VALUES(?, ?, NOW(), ?)`,
        [post.title, post.description, post.author],
        function (err, result) {
          if (err) throw error;
          response.writeHead(302, { Location: `/?id=${result.insertId}` });
          response.end();
        })
    });
  } else if (pathname === '/update') {
    db.query(`SELECT * FROM topic`, function (dirErr, topics) {
      if (dirErr) throw error;

      db.query(`SELECT * FROM author`, function (fileErr, authors) {
        if (fileErr) throw error;

        db.query(`SELECT * FROM topic WHERE id=?`, [queryData.id], function (fileErr, topic) { // 배열에 담아서 주면 더 안전함. SQL문에 자동으로 치환해서 id=? 값에 넣어줌. 원래는 topic.id=${queryData.id} 였음. (세탁)
          var list = template.list(topics);
          var html = template.HTML(topic[0].title, list,
            `
          <form action="/update_process" method="post">
            <input type="hidden" name="id" value="${topic[0].id}">
              <p>
                <input type="text" name="title" placeholder="title" value="${topic[0].title}">
              </p>
              <p>
                <textarea name="description" placeholder="description">${topic[0].description}</textarea>
              </p>
              <p>
                ${template.authorPicker(authors, topic[0].author_id)}
              </p>
              <p>
                <input type="submit" value="Post edits">
              </p>
            </form>
          `,
            `<a href="/create">create</a> <a href="/update?id=${topic[0].id}">update</a>`
          ); response.writeHead(200);
          response.end(html);
        });
      })
    });
  } else if (pathname === '/update_process') {
    var body = '';
    request.on('data', function (data) {
      body = body + data;
    });
    request.on('end', function () {
      var post = qs.parse(body);
      db.query(`UPDATE topic SET title=?, description=?, created=NOW(), author_id=? WHERE id=?`, [post.title, post.description, post.author, post.id], function (err, result) {
        if (err) throw error;
        response.writeHead(302, { Location: `/?id=${post.id}` });
        response.end();
      });
    });
  } else if (pathname === '/delete_process') {
    var body = '';
    request.on('data', function (data) {
      body = body + data;
    });
    request.on('end', function () {
      var post = qs.parse(body);
      db.query(`DELETE FROM topic WHERE id=?`, [post.id], function (err, result) {
        if (err) throw error;
        response.writeHead(302, { Location: `/` });
        response.end();
      });
    });
  } else {
    response.writeHead(404);
    response.end('Not found');
  }
});
app.listen(3000);
