'use strict';

/**
 * @ngdoc function
 * @name chitchat.controller:PhotosCtrl
 * @description
 * # MainCtrl
 * Controller of chitchat
 */
angular.module('chitchat')
	.controller('PhotosCtrl', function($scope, $rootScope, $state, $uibModal, $filter, $localStorage, QuickbloxService, Config, $http, $httpParamSerializer) {
		var story_formdata = new FormData();
		$scope.init = function() {
			$scope.story = {
				story_location_id: "",
				story_user_id: "",
				story_type: 1,
				story_main_url: "",
				//additional params
				story_edit_url: "",
				story_tumb_url: "",
				story_is_vip: 0,
				story_is_approved: 1
			};
			// $scope.qbParams = {page: 1, per_page: 100};
			// $scope.pagination = {total: 0, page: 1, maxsize: 5, per_page: 100};
			$scope.gridOptions = {
				rowData: null,
				enableColResize: true,
				enableFilter: true,
				rowHeight: 40,
				rowSelection: 'multiple',
				suppressRowClickSelection: true,
				columnDefs: [
					{headerName:'Story ID', field: 'story_id', width: 80, filter: 'text', filterParams: {apply: true}},
					{headerName:'Story Location ID', field: 'story_location_id', width: 150, filter: 'text', filterParams: {apply: true}},
					{headerName:'Story User ID', field: 'story_user_id', width: 120, filter: 'text', filterParams: {apply: true}},
					{headerName:'Story Type', field: 'story_type', width: 100, filter: 'text', filterParams: {apply: true}},
					{headerName:'Story main url', field: 'story_main_url', filter: 'text', filterParams: {apply: true}},
					{headerName:'Story is approved', field: 'story_is_approved', width: 150, filter: 'text', filterParams: {apply: true}}
				],
			};
			$scope.getAllStories();
		};
		$scope.onFilterChanged = function(value) {
			$scope.filterText = value;
			$scope.gridOptions.api.setQuickFilter(value);
		};
		$scope.getAllStories = function() {
			var url = Config.api.url + "?action=getAllStories";
			$http.get(url).then(function(res) {
				//console.log(res);
				$scope.storyPhotos = res.data.values;
				if ($scope.gridOptions.api !== null) {
					$scope.gridOptions.api.setRowData($scope.storyPhotos);
				}
			},
			function(err) {
				alert("Failed to connect server(get).");
				$scope.storyPhotos = [];
				$scope.gridOptions.api.setRowData($scope.storyPhotos);
			});
		};
		$scope.openModal = function(page, size) {
			$scope.modal = $uibModal.open({
				animation: true,
				templateUrl: page,
				size: size,
				scope: $scope,
				backdrop: 'static',
				resolve: {
					items: function() {
						return $scope.items;
					}
				}
			});
		};
		$scope.closeModal = function() {
			$scope.modal.close();
		};
		$scope.showAddPhoto = function() {
			$scope.openModal('views/modal/addphoto.html', 'lg');
		};
		$scope.prepareUpload = function($files) {
			//console.log($files);
			$("#upload-file-info").html($files[0].name);
			story_formdata.append("story_main", $files[0]);
		};
		$scope.submit = function() {
			//console.log($scope.story);
			var story_params = $httpParamSerializer($scope.story);
			$rootScope.startLoading('AddingPhoto');
			var url = Config.api.url + "?action=addStory&" + story_params;
			var request = {
				method: 'POST',
				url: url,
				data: story_formdata,
				headers: {
					'Content-Type': undefined
				}
			};
			//console.log(request);
			// SEND THE FILES.
			$http(request).then(function successCallback(res) {
				console.log(res);
				$rootScope.finishLoading('AddingPhoto');
				$scope.story = {
					story_location_id: "",
					story_user_id: "",
					story_type: 1,
					story_main_url: "",
					//additional params
					story_edit_url: "",
					story_tumb_url: "",
					story_is_vip: 0,
					story_is_approved: 1
				};
				$scope.closeModal();
				$scope.getAllStories();
			}, function errorCallback(err) {
				alert("Failed to connect server(get).");
				$rootScope.finishLoading('AddingPhoto');
			});
		};
		$scope.init();
	});
