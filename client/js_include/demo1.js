// Three.js globals.
var renderer = null;
var scene = null;
var camera = null;
var view = null;
var timer = null;

// Create a variable at the top-level scope so everyone can see it.
var ws = null;

// Change this based on whatever IP address I get today.
var server = 'localhost:8080';

// Initialize a scene with an id, model, and colour.
function initScene(modelSource, color)
  {
  var container = document.getElementById('container');
  
  var parent = document.getElementById('threedpane');
  
  // Create a renderer.
  renderer =
    new
      THREE.WebGLRenderer(
        {
        antialias: true,
        alpha: true
        });

  // Use the full window size with clear background.
  renderer.setSize(parent.offsetWidth, parent.offsetHeight);
  renderer.setClearColor(0x000000, 0);

  // Add the renderer to the DOM.
  container.appendChild(renderer.domElement);

  view = renderer.domElement;
  
  // Create a scene.
  scene = new THREE.Scene();

  // Create a camera.
  camera =
    new
      THREE.PerspectiveCamera(
        75,
        container.offsetWidth / container.offsetHeight,
        1,
        1000 );

  // Don't get too close.
  camera.position.z = 10;

  // Add the camera to the scene.
  scene.add(camera);

  // Add some simple controls to look at the pretty model.
  controls = 
    new THREE.TrackballControls(
      camera, 
      renderer.domElement);

  // Setup the controls with some good defaults.
  controls.rotateSpeed = 1.0;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.2;

  controls.noZoom = false;
  controls.noPan = false;

  controls.staticMoving = false;
  controls.dynamicDampingFactor = 0.3;

  controls.minDistance = 1.1;
  controls.maxDistance = 100000;

  // [ rotateKey, zoomKey, panKey ]
  controls.keys = [ 16, 17, 18 ];

  // Setup some mood lighting.
  var dirLight = new THREE.DirectionalLight(0xffffff, 0.95);

  dirLight.position.set(-3, 3, 7);
  dirLight.position.normalize();
  scene.add(dirLight);
 
  // And some additional lighting.
  var pointLight = new THREE.PointLight(0xFFFFFF, 5, 50);

  pointLight.position.set(10, 20, -10);
  scene.add(pointLight);

  // Now load the model.
  var jsonLoader = new THREE.JSONLoader();

  jsonLoader.load(
    modelSource,
    function(geometry)
      {
      // Compute vertex normals to make the entire model smooth.
      geometry.computeVertexNormals();

      var model =
        new
          THREE.Mesh(
            geometry, new THREE.MeshPhongMaterial({color: color}));
      
      // Add the model.
      scene.add(model);

      $(parent).css('background-image', 'none');

      requestAnimationFrame(
        function()
          {
          renderer.render(scene, camera);
          });
      });
  }

// Start listening for events.
function listenToEvents()
  {
  // Listen for the start of user interaction.
  view.addEventListener('mousedown', startListeningToEvents);
  view.addEventListener('touchstart', startListeningToEvents);
  
  // The mouse wheel event is special, just manually update it.
  view.addEventListener('mousewheel', updateMouseWheel);
  view.addEventListener('DOMMouseScroll', updateMouseWheel);
  }

// Manually update the display in response to mouse wheel events.
function updateMouseWheel()
  {
  requestAnimationFrame(
    function()
      {
      controls.update();

      renderer.render(scene, camera);
      });
  }
 
// Start listening for mouse events. 
function startListeningToEvents()
  {
  // Setup a timer to update the display independently from user interface events.
  timer = 
    setInterval(
      function()
        {
        requestAnimationFrame(
          function()
            {
            controls.update();
      
            renderer.render(scene, camera);
            });
        },
      10);
      
  // Now listen for user interface vents.
  view.addEventListener('mouseup', stopListeningToEvents);
  view.addEventListener('mouseout', stopListeningToEvents);
  view.addEventListener('touchend', stopListeningToEvents);
  }

// Stop listening for user interface events.  
function stopListeningToEvents()
  {
  // Stop updating the display.
  clearInterval(timer);
  
  view.removeEventListener('mouseup', stopListeningToEvents);
  view.removeEventListener('mouseout', stopListeningToEvents);
  view.removeEventListener('touchend', stopListeningToEvents);
  }
  
// Once the document is ready, setup the interface and bind functions to 
// DOM elements.
$(document).ready(
  function ()
    {
    // Add a new container.
    $('#threedpane').append('<div id="container"></div>');
    
    initScene("http://" + server + "/models/teapot.js", 0x009900);
    
    listenToEvents();
    });

// Once the document is ready, setup the interface and bind functions to 
// DOM elements.
$(document).ready(
  function ()
    {
    // Disable disconnect at start.
    $('#disconnect').prop('disabled', true);
    
    // Bind function to establish connection to connect button.
    $('#connect').click(
      function ()
        {
        // Connect the global variable to the server.
        ws = new WebSocket("ws://" + server);

        // I am connected.
        ws.onopen = 
          function()
            {
            // Disallow repeated connect requests.
            $('#connect').prop('disabled', true);
            
            // Allow disconnect.
            $('#disconnect').prop('disabled', false);  
            
            // Now that I am connected. Issue an AJAX call on my REST server to
            // get a list of model names.
            $.ajax(
              {
              type: "GET",
              url: "http://" + server + "/models/?format=json&name=1",
              success:
                function (data)
                  {
                  // Take my JSON list of models and shove them into my
                  // Angular model. Don't forget to update the display after
                  // my hack.
                  angular.element($('#controller')).scope().setModels(data).$apply();
                  }
              });
            };

        // Handle a message from the server.
        ws.onmessage = 
          function(event) 
            { 
            // WebSockets does text and binary, not structured data.
            // Manually parse the JSON.
            var message = JSON.parse(event.data);
            
            // TODO: Route these messages to three.js objects.
            
            // Log the message and manually refresh AngularJS.
            //angular.element($('#controller')).scope().log(message).$apply();
            };

        // Let the user know the connection closed.
        ws.onclose = 
          function()
            { 
            // Reenable connections.
            $('#connect').prop('disabled', false);

            // Disallow repeated disconnect requests.
            $('#disconnect').prop('disabled', true);

            // Clear things out.
            angular.element($('#controller')).scope().clear().$apply();
            };
        });
    
    // Bind function to disconnect to the disconnect button.
    $('#disconnect').click(
      function ()
        {
        // Manually disconnect from websockets, even though I don't need to.
        ws.close();
        });
    });

// AngularJS controller for ThreeDModels demo.
function ThreeDModel($scope) 
  {
  // Create a model for our three D models.
  $scope.threedmodels = [];
  
  /* // Send a message.
  $scope.sendMessage = 
    function() 
      {
      // Disable message interface until I get a response from the server.
      $('#message').prop('disabled', true);
      $('#send').prop('disabled', true);

      // Now that the interface is disabled, send the data.
      ws.send($scope.messageText);
      $scope.messageText = '';
      }; */
      
  $scope.setModels =
    function ($threedmodels)
      {
      // Add the threedmodel to the list of threedmodels.
      $scope.threedmodels = $threedmodels;
      
      // Return the scope in case the caller wants to manually update.
      return $scope;
      };
      
  $scope.loadModel =
    function ($modelname)
      {
      alert("Loading " + $modelname);
      };

  /* // Log a message.
  $scope.log =
    function ($message)
      {
      // Add the message to the model.
      $scope.threedmodels.push($message);
      
      // Return the scope in case the caller wants to manually update.
      return $scope;
      }; */
      
  // Clear the model.
  $scope.clear =
    function ()
      {
      $scope.threedmodels = [];
      
      // Return the scope in case the caller wants to manually update.
      return $scope;
      };
  }
