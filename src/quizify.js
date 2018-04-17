import Exceptions from './Exceptions';
import Utils from './Utils';
import DOM from './DOM';
import { Options } from './Options';
import { QUESTION_REQUIRED_PROPERTIES, ANSWER_REQUIRED_PROPERTIES } from './Constants';
import { QuizifyQuestion, QuizifyResult } from './Returns';
import Events from './Events';
import { EventDispatcher } from './EventDispatcher';

/**
 * quizify
 */
class quizify {
    /**
     * The quizify constructor
     * @param {Array} data quiz data
     * @param {Object} options options for quizify
     */
    constructor(data, options = {}) {
        this._options = Object.assign(Options, options);
        this._position = -1;
        this._validateData(data);
        this._setup(data);
    }

    /**
     * Validates the quiz data, will throw an exception when invalid data is found
     * @param {Array} data the quiz data to validate
     * @private
     */
    _validateData(data) {
        // makes sure the data is set
        if (!data)
            throw new Exceptions.QuizDataRequiredException();
        // makes sure the type of the data is an array
        if (typeof data != typeof [])
            throw new Exceptions.QuizDataInvalidType(typeof data);
        // makes sure the data is not an empty object or array
        if (Utils.IsEmpty(data))
            throw new Exceptions.QuizDataInvalidException();

        // loop over the questions and answers and ensure all the properties are set
        for (let i = 0; i < data.length; i++) {
            let question = data[i];

            let questionProperties = Utils.GetObjectProperties(question);
            if (!Utils.CheckAllValuesExistInArray(questionProperties, QUESTION_REQUIRED_PROPERTIES))
                throw new Exceptions.QuizQuestionDataRequiredException(question);

            for (let j = 0; j < question.answers.length; j++) {
                let answer = question.answers[j];
                let answerProperties = Utils.GetObjectProperties(answer);
                if (!Utils.CheckAllValuesExistInArray(answerProperties, ANSWER_REQUIRED_PROPERTIES))
                    throw new Exceptions.QuizAnswerDataRequiredException(answer);
            }
        }
    }

    /**
     * Runs the setup and assignment of quiz data
     * @param {Array} data the quiz data
     */
    _setup(data) {
        // answers limits
        for (let i = 0; i < data.length; i++) {
            // retrieve all the correct answers
            let correctAnswers = data[i].answers.filter(ans => { return ans.is_correct === true });
            // retrieve all the incorrect answers, shuffled
            let incorrectAnswers = Utils.ShuffleArray(data[i].answers.filter(ans => { return ans.is_correct === false }));

            if (data[i].answer_limit !== null) {
                if (data[i].answer_limit <= correctAnswers.length && data[i].answer_limit > data[i].answers.length)
                    continue;

                data[i].answers = correctAnswers.concat(incorrectAnswers.slice(0, data[i].answer_limit - correctAnswers.length));
            }
        }

        // shuffle questions
        if (this._options.shuffle === true)
            data = Utils.ShuffleArray(data);

        // shuffle answers
        if (this._options.shuffleAnswers === true)
            for (let i = 0; i < data.length; i++)
                data[i].answers = Utils.ShuffleArray(data[i].answers);

        // trim question array to assigned limit
        if (this._options.limitQuestionsTo !== null && !isNaN(this._options.limitQuestionsTo))
            data = data.slice(0, this._options.limitQuestionsTo)

        this._data = data;
    }

    /**
     * Creates a new dom node for a question
     * @param {Object} question the question to construct the DOM node for
     */
    _constructQuestionDOMNode(question) {
        // the main question container        
        let container = DOM.CreateElement('div',this._options.questionContainerClass);                

        // the question paragraph
        let questionParagraph = DOM.CreateElement('p');
        DOM.SetText(questionParagraph,question.content);
        DOM.AddChild(container,questionParagraph);        

        // the list containg answers
        let answersList = DOM.CreateElement('ul',this._options.answerListClass);        

        // add all possible answers
        for (let i = 0; i < question.answers.length; i++) {
            let answer = question.answers[i];
            let answerListItem = DOM.CreateElement('li',this._options.answerListItemClass);            

            // get the correct input type to use
            let inputType = question.has_multiple_answers === true ? 'checkbox' : 'radio';

            // generate the input
            let input = DOM.CreateElement('input');
            input.type = inputType;
            input.name = 'quizify_answer_option';
            input.value = answer.id;
            DOM.AddChild(answerListItem,input);            
            // append the answer text as well
            let answerText = DOM.CreateElement('span');
            DOM.SetText(answerText,' ' + answer.content);     
            DOM.AddChild(answerListItem,answerText);                   

            DOM.AddChild(answersList,answerListItem);            
        }

        // append the list of options to the container
        DOM.AddChild(container,answersList);        

        // create the accept button
        let acceptButton = DOM.CreateElement('button',...this._options.questionNextButtonClass.split(' '));        
        acceptButton.addEventListener('click', () => {
            // call with context attached
            this._processDOMResult.call(this)
        });
        DOM.SetText(acceptButton,'Next Question');        
        DOM.AddChild(container,acceptButton);        

        return container;
    }

    /**
     * Retrieves chosen answers from the dom
     */
    _processDOMResult() {
        // retrieve the checked input qyuizify elements
        let res = document.querySelectorAll('input[name=quizify_answer_option]:checked');
        if (res.length <= 0)
            throw new Exceptions.QuizNoAnswerSelectedException();

        // get the selection of the user
        let chosenOptions = [];
        for (let i = 0; i < res.length; i++)
            chosenOptions.push(res[i].value)

        // pass it to the processing function
        this.processUserAnswer(chosenOptions);
    }

    _constructResultsDOMNode(resultData) {
        let container = DOM.CreateElement('div',this._options.questionContainerClass);        

        let heading = DOM.CreateElement('h2');        
        DOM.SetText(heading,'Quiz Results');
        DOM.AddChild(container,heading);

        resultData.dom_node = container;

        return resultData;

    }

    _gradeQuestions() {
        let totalPossible = 0; // total possible score of quiz
        let totalScored = 0; // total points scored
        let totalPenalised = 0; // total penalisation points (incorrect selections on multiples)
        let totalFinal = 0; // the final score

        for (let i = 0; i < this._data.length; i++) {
            let question = this._data[i];
            totalPossible += question.weight;

            let scored = 0;
            let penal = 0;

            // get total correct
            for (let j = 0; j < question.answers.length; j++) {
                let answer = question.answers[j];

                if (answer.is_correct && question._selectedAnswers.indexOf(answer.id.toString()) !== -1)
                    scored += question.weight / question.answers.filter(ans => ans.is_correct === true).length;
                // penalise on multiple choice for incorrect selection
                else if (question.has_multiple_answers && !answer.is_correct && question._selectedAnswers.indexOf(answer.id.toString()) !== -1) {
                    // we need to make sure that th
                    penal += question.weight / question.answers.filter(ans => ans.is_correct === true).length;
                }
            }

            // make sure we dont remove points from the total if the penalisation points are larger than the scored points
            if (scored >= penal) {
                totalScored += scored;
                totalPenalised += penal;
            }
        }

        totalFinal = totalScored - totalPenalised;


        console.log('Total Possible:', totalPossible);
        console.log('Total Score:', totalScored);
        console.log('Total Penalised:', totalPenalised);
        console.log('Total Final:', totalFinal);

        let resData = {
            totalPossibleScore: totalPossible,
            totalAchievedScore: totalScored,
            totalPenalisedScore: totalPenalised,
            totalFinalScore: totalFinal,
            dom_node: null
        };

        return this._constructResultsDOMNode(resData);
    }

    /**
     * Processes the answers of the user
     * @param {Array} chosenAnswers all the selected answer ids
     */
    processUserAnswer(chosenAnswers) {
        if (chosenAnswers.length <= 0)
            throw new Exceptions.QuizNoAnswerSelectedException();

        // retrieve the current question, and append the answers to the item
        let question = this._data[this._position];
        question._selectedAnswers = chosenAnswers;

        this.dispatchEvent(Events.AnswerSelected());
    }

    /**
     * Retrieve the next step in the quiz, either a question or a result
     */
    getNext() {
        if (this._position > -1 && !this._data[this._position]._selectedAnswers)
            throw new Exceptions.QuizNoAnswerSelectedException();

        this._position++;

        let nextQuestion = this._data[this._position];
        if (nextQuestion) {
            // check if there are multple correct answers or not
            let possibleAnswerCount = nextQuestion.answers.filter(answer => answer.is_correct === true).length;
            nextQuestion.has_multiple_answers = possibleAnswerCount === 1 ? false : true;

            // construct the dom node
            nextQuestion.dom_node = this._constructQuestionDOMNode(nextQuestion);

            // return the question data
            return new QuizifyQuestion(nextQuestion);
        }
        else {
            // todo : return result type
            let results = this._gradeQuestions();
            return new QuizifyResult(results);
        }
    }
}

// add event dispatching to quizify
Object.assign(quizify.prototype, EventDispatcher.prototype);

export default quizify;