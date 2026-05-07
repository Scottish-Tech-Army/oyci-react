import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { MultiSelect } from 'primereact/multiselect';
import type { EventType } from '../../../models/eventType';
import { useGetQualificationsQuery } from '../../../store/api/qualificationApi';

interface CreateEventTypeProps {
    visible: boolean;
    onHide: () => void;
    onSave: (eventType: EventType) => void;
    editData: EventType | null;
}

const CreateEventType = ({ visible, onHide, onSave, editData }: CreateEventTypeProps) => {
    const { data: qualificationOptions } = useGetQualificationsQuery();

    const [form, setForm] = useState<EventType>(
        () => editData
            ? { ...editData, requiredQualifications: editData.requiredQualifications ?? [] }
            : { name: '', description: '', requiredQualifications: [], defDurMins: undefined, eventDurMins: undefined, experienceMonths: undefined },
    );

    const [defDurHours, setDefDurHours] = useState<number | null>(() => {
        const m = editData?.defDurMins;
        return m ? m / 60 : null;
    });

    const [eventDurHours, setEventDurHours] = useState<number | null>(() => {
        const m = editData?.eventDurMins;
        return m ? m / 60 : null;
    });

    const [expYears, setExpYears] = useState<number | null>(() => {
        const m = editData?.requiredExperienceMonths ?? 0;
        return m ? Math.floor(m / 12) : null;
    });
    const [expMonths, setExpMonths] = useState<number | null>(() => {
        const m = editData?.requiredExperienceMonths ?? 0;
        return m ? m % 12 : null;
    });

    const [submitted, setSubmitted] = useState(false);

    const requiredLabel = (text: string) => (
        <>{text} <span style={{ color: 'red' }}>*</span></>
    );

    const handleSave = () => {
        setSubmitted(true);
        if (
            !form.name.trim() ||
            !form.description.trim() ||
            defDurHours === null || defDurHours <= 0
        ) return;
        const requiredExperienceMonths = ((expYears ?? 0) * 12) + (expMonths ?? 0);
        const defDurMins = Math.round(defDurHours * 60);
        const eventDurMins = eventDurHours ? Math.round(eventDurHours * 60) : undefined;
        onSave({ ...editData, ...form, requiredExperienceMonths, defDurMins, eventDurMins });
        onHide();
    };

    return (
        <Modal show={visible} onHide={onHide} centered size="lg" style={{ zIndex: 1050 }} enforceFocus={false}>
            <Modal.Header closeButton>
                <Modal.Title>{editData ? 'Edit Event Type' : 'Create Event Type'}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="px-4 py-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <Form>
                    <div className="row">
                        <div className="col-md-6">
                            <Form.Group className="mb-3" controlId="et-name">
                                <Form.Label className="fw-semibold">{requiredLabel('Name')}</Form.Label>
                                <InputText
                                    id="et-name"
                                    value={form.name}
                                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter event type name"
                                    className={`w-100${submitted && !form.name.trim() ? ' p-invalid' : ''}`}
                                />
                                {submitted && !form.name.trim() && <small className="text-danger">Name is required.</small>}
                            </Form.Group>
                        </div>
                        <div className="col-md-6">
                            <Form.Group className="mb-3" controlId="et-description">
                                <Form.Label className="fw-semibold">{requiredLabel('Description')}</Form.Label>
                                <InputText
                                    id="et-description"
                                    value={form.description}
                                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Enter description"
                                    className={`w-100${submitted && !form.description.trim() ? ' p-invalid' : ''}`}
                                />
                                {submitted && !form.description.trim() && <small className="text-danger">Description is required.</small>}
                            </Form.Group>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-md-6">
                            <Form.Group className="mb-3" controlId="et-defDurHours">
                                <Form.Label className="fw-semibold">{requiredLabel('Shift Duration')}</Form.Label>
                                <InputNumber
                                    inputId="et-defDurHours"
                                    value={defDurHours}
                                    onValueChange={e => setDefDurHours(e.value ?? null)}
                                    placeholder="e.g. 1.5"
                                    min={0.1}
                                    maxFractionDigits={1}
                                    minFractionDigits={0}
                                    suffix=" hrs"
                                    className={`w-100${submitted && (defDurHours === null || defDurHours <= 0) ? ' p-invalid' : ''}`}
                                    inputClassName="w-100"
                                />
                                {submitted && (defDurHours === null || defDurHours <= 0) && <small className="text-danger">Shift duration is required.</small>}
                            </Form.Group>
                        </div>
                        <div className="col-md-6">
                            <Form.Group className="mb-3" controlId="et-qualifications">
                                <Form.Label className="fw-semibold">Qualifications</Form.Label>
                                <MultiSelect
                                    filter
                                    filterBy="name"
                                    inputId="et-qualifications"
                                    value={form.requiredQualifications ?? []}
                                    options={qualificationOptions}
                                    optionLabel="name"
                                    placeholder="Select qualifications"
                                    display="chip"
                                    className="w-100"
                                    appendTo={document.body}
                                    onChange={e => setForm(prev => ({ ...prev, requiredQualifications: e.value }))}
                                />
                            </Form.Group>
                        </div>
                        <div className="col-md-6">
                            <Form.Group className="mb-3" controlId="et-eventDurHours">
                                <Form.Label className="fw-semibold">Event Duration</Form.Label>
                                <InputNumber
                                    inputId="et-eventDurHours"
                                    value={eventDurHours}
                                    onValueChange={e => setEventDurHours(e.value ?? null)}
                                    placeholder="e.g. 1.5"
                                    min={0.1}
                                    maxFractionDigits={1}
                                    minFractionDigits={0}
                                    suffix=" hrs"
                                    className="w-100"
                                    inputClassName="w-100"
                                />
                            </Form.Group>
                        </div>
                        <div className="col-md-6">
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Experience</Form.Label>
                                <div className="d-flex gap-2">
                                    <div className="flex-grow-1">
                                        <InputNumber
                                            inputId="et-exp-years"
                                            value={expYears}
                                            onValueChange={e => setExpYears(e.value ?? null)}
                                            placeholder="Years"
                                            min={0}
                                            max={50}
                                            suffix=" yrs"
                                            className="w-100"
                                            inputClassName="w-100"
                                        />
                                    </div>
                                    <div className="flex-grow-1">
                                        <InputNumber
                                            inputId="et-exp-months"
                                            value={expMonths}
                                            onValueChange={e => setExpMonths(e.value ?? null)}
                                            placeholder="Months"
                                            min={0}
                                            max={11}
                                            suffix=" mos"
                                            className="w-100"
                                            inputClassName="w-100"
                                        />
                                    </div>
                                </div>

                            </Form.Group>
                        </div>
                    </div>
                </Form>
            </Modal.Body>
            <Modal.Footer className="px-4 py-3">
                <Button variant="secondary" onClick={onHide}>Cancel</Button>
                <Button variant="success" onClick={handleSave}>Save</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default CreateEventType;
