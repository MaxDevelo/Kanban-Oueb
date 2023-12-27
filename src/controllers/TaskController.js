import TaskModel from "../models/TaskModel";
import LocalStorage from "./LocalStorage.js";
import TaskView from "../views/components/TaskView.js";
import { setDisplayForm } from "./modules/taskDisplay.js";
import StatusEnum from "../models/StatusEnum.js";
import { refreshAllDependencies } from "../utils/dependencyUtils.js";

export default class TaskController {
  constructor() {
    this.init();
    this.tasks = [];
    this.localStorage = new LocalStorage();
    const tasks = this.localStorage.loadTasks();
    this.taskIdCounter = this.localStorage.getLastId() + 1;
    tasks.forEach((task) => this.renderTask(task));
    refreshAllDependencies();
  }

  init() {
    // Get all buttons
    const createTaskButton = document.getElementById("create-task-button");
    const closeButton = document.getElementById("close-button");
    const saveButton = document.getElementById("save-button");
    const saveNoteButton = document.getElementById("task-details-note-button");
    // Get all rows kanban
    const rows = [
      document.getElementById("todo"),
      document.getElementById("wip"),
      document.getElementById("done"),
    ];

    // Add event listeners for tasks buttons
    createTaskButton.addEventListener("click", () => setDisplayForm());
    closeButton.addEventListener("click", () => setDisplayForm());
    saveButton.addEventListener("click", () => {
      if (document.getElementById("task-id").value != "") {
        this.modifyAndSaveTask(
          Number(document.getElementById("task-id").value)
        );
      } else {
        this.createAndSaveTask();
      }
      setDisplayForm();
    });

    saveNoteButton.addEventListener("click", () => {
      const successMessage = document.createElement("p");
      successMessage.textContent = "Notes sauvegardées !";
      successMessage.style.color = "green";
      document.getElementById("task-details-body").appendChild(successMessage);
      setTimeout(() => {
        successMessage.remove();
      }, 3000);

      if (document.getElementById("task-id").value != "") {
        this.addNoteToTask(
          Number(document.getElementById("task-id").value),
          document.getElementById("task-details-note").value
        );
      }

      setDisplayForm();
    });

    // Add event listeners for task drag-and-drop
    rows.forEach((row) => this.addEventListenersForTaskDragAndDrop(row));
  }
  /**
   * this method creates and saves a task
   */
  createAndSaveTask() {
    var taskName = document.getElementById("task-name").value;
    var taskDescription = document.getElementById("task-description").value;
    var taskStartDate = document.getElementById("task-start-date").value;
    var taskEndDate = document.getElementById("task-end-date").value;
    // Get all assignments
    var assignmentsBlock = document.getElementById("assignments-block");
    var assignmentElement = assignmentsBlock.querySelectorAll("p");
    var assignmentsList = Array.from(assignmentElement).map(
      (assignmentElement) => assignmentElement.textContent.trim()
    );
    var taskCodeColor = document.getElementById("task-code-color").value;
    // Get all tags
    var tagsBlock = document.getElementById("tags-block");
    var tagElement = tagsBlock.querySelectorAll("p");
    var tagsList = Array.from(tagElement).map((tagElement) =>
      tagElement.textContent.trim()
    );
    let dependencies = this.getTaskDependencies();
    var newTaskModel = new TaskModel(
      this.taskIdCounter++,
      taskName,
      taskDescription,
      taskStartDate,
      taskEndDate,
      "",
      assignmentsList,
      tagsList,
      taskCodeColor,
      StatusEnum.TODO,
      "",
      dependencies
    );
    this.addTask(newTaskModel);
    refreshAllDependencies();
  }
  /**
   * this method modifies and saves a task
   *
   * @param {number} taskId
   */
  modifyAndSaveTask(taskId) {
    var taskName = document.getElementById("task-name").value;
    var taskDescription = document.getElementById("task-description").value;
    var taskStartDate = document.getElementById("task-start-date").value;
    var taskEndDate = document.getElementById("task-end-date").value;
    // Get all assignments
    var assignmentsBlock = document.getElementById("assignments-block");
    var assignmentElement = assignmentsBlock.querySelectorAll("p");
    var assignmentsList = Array.from(assignmentElement).map(
      (assignmentElement) => assignmentElement.textContent.trim()
    );
    var taskCodeColor = document.getElementById("task-code-color").value;
    // Get all tags
    var tagsBlock = document.getElementById("tags-block");
    var tagElement = tagsBlock.querySelectorAll("p");
    var tagsList = Array.from(tagElement).map((tagElement) =>
      tagElement.textContent.trim()
    );
    var taskDiv = document.getElementById(`task-${taskId}`);
    // Get row status of the task
    var taskStatus = taskDiv.parentElement.id;
    // Delete old task
    taskDiv.remove();
    let taskNotes = document.getElementById("task-details-note").value;
    let dependencies = this.getTaskDependencies();

    var newTaskModel = new TaskModel(
      taskId,
      taskName,
      taskDescription,
      taskStartDate,
      taskEndDate,
      "",
      assignmentsList,
      tagsList,
      taskCodeColor,
      taskStatus == "todo"
        ? StatusEnum.TODO
        : taskStatus == "wip"
          ? StatusEnum.WIP
          : StatusEnum.DONE,
      taskNotes,
      dependencies
    );
    this.modifyTask(newTaskModel);
    refreshAllDependencies();
  }

  /**
   * this method adds a note in the taks details and in the localStorage
   *
   * @param {number} taskId
   * @param {string} taskNote
   */
  addNoteToTask(taskId, taskNote) {
    this.localStorage.addNoteToTask(taskId, taskNote);
    this.renderTask(taskId);
  }
  /**
   * this method adds a task in the localStorage and in the tasks array
   *
   * @param {TaskModel} taskModel
   */
  addTask(taskModel) {
    this.localStorage.addTask(taskModel);
    this.renderTask(taskModel);
  }
  /**
   * this method modifies a task in the localStorage and in the tasks array
   *
   * @param {TaskModel} taskModel
   */
  modifyTask(taskModel) {
    this.localStorage.modifyTask(taskModel);
    this.renderTask(taskModel);
  }
  renderTask(taskData) {
    const taskModel = new TaskModel(
      taskData.id,
      taskData.name,
      taskData.description,
      taskData.startDate,
      taskData.endDate,
      taskData.completDate,
      taskData.assignments,
      taskData.tags,
      taskData.codeColor,
      taskData.status,
      taskData.note
    );
    TaskView.render(taskModel, this.localStorage); // render the task in the DOM
  }
  /**
   * this method adds event listeners for task drag-and-drop
   *
   * @param {HTMLElement} element
   */
  addEventListenersForTaskDragAndDrop(element) {
    if (element == null) return;

    element.addEventListener("drop", (event) => {
      event.preventDefault();
      const id = event.dataTransfer.getData("id");
      const tasks = this.localStorage.loadTasks();
      let taskId = id.split("-")[1];
      const draggedTask = tasks.find((task) => task.id == taskId);

      if (draggedTask) {
        let status = event.target.id;
        let completDate = status === "done" ? this.getCurrentDate() : "";
        this.localStorage.modifyCompleteDate(taskId, completDate);
        this.localStorage.modifyTaskStatus(taskId, status);
      }

      const task = document.getElementById(id);
      if (event.target === element) {
        // Move the task
        event.target.appendChild(task);

        refreshAllDependencies();
      }
    });

    element.addEventListener("dragover", (event) => {
      event.preventDefault();
    });
  }

  getCurrentDate() {
    var today = new Date();
    var year = today.getFullYear();
    var month = ("0" + (today.getMonth() + 1)).slice(-2);
    var day = ("0" + today.getDate()).slice(-2);

    // Format the date as YYYY-MM-DD
    var formattedDate = year + "-" + month + "-" + day;
    return formattedDate;
  }
  /**
   * This function allows you to get all dependencies in
   * multipl selector
   *
   */
  getTaskDependencies() {
    const dependencyInput =
      document.getElementById("task-dependencies").selectedOptions;
    var dependencies = Array.from(dependencyInput).map(({ value }) => value);
    dependencies = dependencies.filter((element) => {
      return element !== null;
    });
    return dependencies;
  }
}
