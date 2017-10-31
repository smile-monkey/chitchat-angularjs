'use strict';

/**
 * @ngdoc function
 * @name chitchat.controller:VIPUsersCtrl
 * @description
 * # MainCtrl
 * Controller of chitchat
 */
angular.module('chitchat')
	.controller('VIPUsersCtrl', function($scope, $rootScope, $state, $uibModal, $filter, $localStorage, QuickbloxService, Config, $http, $httpParamSerializer) {
		$scope.init = function() {
			$scope.per_page = 100;
			$scope.qbParams = {page: 1, per_page: $scope.per_page};
			$scope.qbDialogParams = {skip: 0, limit: $scope.per_page, type: 3};
			$scope.pagination = {total: 0, page: 1, maxsize: 5, per_page: $scope.per_page};
			$scope.gridOptions = {
				rowData: null,
				enableColResize: true,
				enableFilter: true,
				rowHeight: 40,
				rowSelection: 'multiple',
				suppressRowClickSelection: true,
				columnDefs: [
					{
						headerName:'',
						field: 'checkbox',
						cellClass:['text-center'],
						checkboxSelection: true,
						suppressMenu: true,
						suppressSorting: true,
						headerCellRenderer: $scope.selectAllRenderer,
						width: 40
					},
					{headerName:'QuickBlox ID', field: 'user_qb_userid', width: 120, filter: 'text', filterParams: {apply: true}},
					{headerName:'Username', field: 'user_name', filter: 'text', filterParams: {apply: true}},
					{headerName:'Device ID', field: 'user_device_id', width: 320, filter: 'text', filterParams: {apply: true}},
					{headerName:'Created Date', field: 'user_created', width: 150, filter: 'text', filterParams: {apply: true}},
					{headerName:'Media Upgrade', field: 'user_is_media', width: 120, filter: 'text', filterParams: {apply: true}},
				],
				onCellClicked: $scope.showChat
			};
			$scope.vipUsers = [];
			$scope.selUser = null;
			$scope.selChatDialog = {};
			$scope.chat = {
				messages:[],
				me: {
					userId: $localStorage.session.user_id.toString(),
					userName: $localStorage.session.login
				}
			};
			$scope.chatDialogs = [];
			$scope.selMultiUser = null;
			$scope.selMultiChatDialog = [];
			$scope.isShowChatUser = false;
			$scope.getUsers();
		};
		$scope.selectAllRenderer = function(params) {
			var cb = document.createElement('input');
			cb.setAttribute('type', 'checkbox');

			var eHeader = document.createElement('label');
			var eTitle = document.createTextNode(params.colDef.headerName);
			eHeader.appendChild(cb);
			eHeader.appendChild(eTitle);

			cb.addEventListener('change', function(e) {
				if ($(this)[0].checked) {
					params.api.selectAll();
				} else {
					params.api.deselectAll();
				}
			});
			return eHeader;
		};
		$scope.onFilterChanged = function(value) {
			$scope.filterText = value;
			$scope.gridOptions.api.setQuickFilter(value);
		};
		$scope.pageChanged = function() {
			$scope.gridOptions.api.showLoadingOverlay();
			$scope.qbParams.page = $scope.pagination.page;
			$scope.qbDialogParams.skip = ($scope.pagination.page - 1) * $scope.per_page;
			$scope.getUsers();
		};
		$scope.getUsers = function() {
			var url = Config.api.url + "?action=getVIPUser";
			var qs = $httpParamSerializer($scope.qbParams);
			url = url + "&" + qs;
			$http.get(url).then(function(res) {
				//console.log(res);
				$scope.vipUsers = res.data.values;
				if ($scope.gridOptions.api !== null) {
					$scope.gridOptions.api.setRowData($scope.vipUsers);
				}
				$scope.pagination.total = res.data.total_entries;
				if ($scope.filterText !== undefined && $scope.filterText !== "") {
					$scope.gridOptions.api.setQuickFilter($scope.filterText);
				}
			},
			function(err) {
				alert("Failed to connect server(get).");
				$scope.vipUsers = [];
				$scope.gridOptions.api.setRowData($scope.vipUsers);
				$scope.pagination.total = 0;
				$scope.pagination.page = 0;
			});
		};
		$scope.filterChatDialogByOccupant = function(dialogs, occupant_id) {
			// var occupant_id = $scope.selUser.user_qb_userid;
			return $filter('filter')(dialogs, {occupants_ids:occupant_id});
		};
		$scope.showChat = function(param) {
			if (param.column.colId === 'checkbox') {
				return false;
			}
			$rootScope.startLoading('loadingChat');
			$scope.selUser = param.data;
			var modal_template = 'views/modal/chat.html';
			QuickbloxService.getDialogs().then(function(res) {
				var filteredDialog = $scope.filterChatDialogByOccupant(res.items, $scope.selUser.user_qb_userid);
				if (filteredDialog.length > 0) {
					$scope.selChatDialog = filteredDialog[0];
					QuickbloxService.getMessageList($scope.selChatDialog._id).then(function(res) {
						console.log(res.items);
						$scope.setMessage(res.items);
						$scope.openModal(modal_template, 'lg');
						$rootScope.finishLoading('loadingChat');
					},
					function(err) {
						alert('Failed to get message list. Please refresh this page');
						$rootScope.finishLoading('loadingChat');
					});
				} else {
					var occupants = [$scope.selUser.user_qb_userid];
					QuickbloxService.createDialog(occupants).then(function(dialog) {
						$scope.selChatDialog = dialog;
						$scope.openModal(modal_template, 'lg');
						$rootScope.finishLoading('loadingChat');
					},
					function(err) {
						alert('Failed to create dialog.');
						$rootScope.finishLoading('loadingChat');
					});
				}
			},
			function(err) {
				if (err.code === 401) {
					alert('Session Expired! Please login again.');
				} else {
					alert('Failed to get dialogs');
				}
				$rootScope.logout();
			});
		};
		$scope.setMessage = function(messages) {
			var msg = {};
			angular.forEach(messages, function(message, key) {
				msg.id = message._id;
				if (message.attachments.length > 0) {
					var fileId = message.attachments[0].id;
					var attachtype = message.attachments[0].type;
					var qbSessionToken = QuickbloxService.session.token;
					var privateUrl = "https://apichitchat.quickblox.com/blobs/" + fileId + "/download?token=" + qbSessionToken;
					var imageHTML = "";
					if (attachtype == 'video') {
						imageHTML = "<video width='320' height='240' controls><source src='" + privateUrl + "' type='video/mp4'>Your browser does not support the video tag.</video>";
					} else {
						imageHTML = "<img src='" + privateUrl + "' alt='photo'/>";
					}
					msg.text = imageHTML;
				} else {
					msg.text = message.message;
				}
				msg.userId = message.sender_id.toString();
				msg.date = message.date_sent * 1000;
				$scope.chat.messages.push(msg);
				msg = {};
			});
			$scope.chat.messages.reverse();
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
			$scope.selUser = null;
			$scope.chat.messages = [];
			$scope.modal.close();
		};
		$scope.sendMessage = function(message) {
			if ($scope.selUser == null) {
				alert('Please select receiver');
			} else {
				QuickbloxService.sendMessage($scope.selChatDialog, message.text);
			}
		};
		$scope.sendAttachment = function(attach) {
			if (angular.isDefined(attach)) {
				QuickbloxService.sendAttachment($scope.selChatDialog, attach);
			}
		};
		$scope.showMultiChat = function() {
			$scope.selMultiUser = $scope.gridOptions.api.getSelectedRows();
			if ($scope.selMultiUser.length > 0) {
				$scope.openModal('views/modal/multichat.html', 'lg');
			} else {
				alert('Please select at least one user');
			}
		};
		$scope.sendMultiChat = function(message) {
			$scope.count = 0;
			$scope.total = $scope.selMultiUser.length;
			if (message === undefined || message === '') {
				alert('please enter message');
				return false;
			}
			$rootScope.startLoading('SendingChat');
			QuickbloxService.getDialogs().then(function(res) {
				$scope.chatDialogs = res.items;
				$scope._sendMultiChat($scope.count, message);
			},
			function(err) {
				alert('Failed to get Dialog in Mass Messaging!');
				$rootScope.finishLoading('SendingChat');
			});
		};
		$scope._sendMultiChat = function(index, message) {
			$scope.count = index + 1;
			var user = $scope.selMultiUser[index];
			var seldialog = {}
			seldialog = $scope.filterChatDialogByOccupant($scope.chatDialogs, user.user_qb_userid);
			seldialog = seldialog[0];
			if (seldialog === undefined || seldialog.length <= 0) {
				var occupants = [user.user_qb_userid];
				QuickbloxService.createDialog(occupants).then(function(dialog) {
					seldialog = dialog;
					QuickbloxService.sendMessage(seldialog, message);
					$scope._recurSendMultiChat(message);
				},
				function(err) {
					$scope._recurSendMultiChat(message);
				});
			} else {
				QuickbloxService.sendMessage(seldialog, message);
				$scope._recurSendMultiChat(message);
			}
		};
		$scope._recurSendMultiChat = function(message) {
			if ($scope.count < $scope.total) {
				$scope._sendMultiChat($scope.count, message);
			} else {
				$rootScope.finishLoading('SendingChat');
				$scope.closeModal();
			}
		};
		$scope.init();
	});
